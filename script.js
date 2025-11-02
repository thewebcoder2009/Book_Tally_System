/* NEET Chapter Completion Tracker v1
   - Tabbed layout: physics, chemistry, biology
   - Class 11 chapters preloaded
   - Two groups: coreBooks & allenBooks
   - Add/Delete chapters; Add/Delete/Rename books
   - Per-chapter completion %, per-book summary
   - Persistent localStorage: key "neetBooks_v1"
*/

const STORAGE_KEY = "neetBooks_v2";

// === CHAPTER-BOOK APPLICABILITY MAPPING ===
// adjust lists here if you want to change which chapters are considered
// Physical chemistry chapters (N. Awasthi applies)
const PHYSICAL_CHEM_CHAPTERS = [
  "Some Basic Concepts of Chemistry",
  "States of Matter",
  "Thermodynamics",
  "Equilibrium",
  "Redox Reactions",
  "Structure of Atom"
];

// Inorganic chemistry chapters (O.P. Tandon applies)
const INORGANIC_CHEM_CHAPTERS = [
  "The s-Block Elements",
  "The p-Block Elements",
  "Classification of Elements and Periodicity",
  "Chemical Bonding and Molecular Structure"
];

const initial = {
	physics: {
		coreBooks: ["PW Module", "Aakash Module", "S.L. Arora", "H.C. Verma", "Aakash Momentum Booster", "MTG PYQ", "D.C. Pandey", "DPP"],
		allenBooks: ["Allen Module", "Allen NCR", "Allen Race", "Allen Extra Edge"],
		chapters: [
			"Physical world", "Units and Measurements", "Motion in a Straight Line", "Motion in a Plane",
			"Laws of Motion", "Work Energy and Power", "System of Particles and Rotational Motion",
			"Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids",
			"Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves"
		]
	},
	chemistry: {
		coreBooks: ["PW Module", "Aakash Module", "N. Awasthi", "O.P. Tandon", "Aakash Momentum Booster", "MTG PYQ", "DPP"],
		allenBooks: ["Allen Module", "Allen NCR", "Allen Race", "Allen Extra Edge"],
		chapters: [
			"Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity",
			"Chemical Bonding and Molecular Structure", "States of Matter", "Thermodynamics", "Equilibrium",
			"Redox Reactions", "The s-Block Elements", "The p-Block Elements",
			"Organic Chemistry: Basic Principles", "Hydrocarbons", "Environmental Chemistry"
		]
	},
	biology: {
		coreBooks: ["PW Module", "Aakash Module", "MTG Fingertips", "MTG PYQ", "Cengage", "Dr. Ali", "Aakash Momentum Booster", "PW Most Wanted Series", "DPP"],
		allenBooks: ["Allen Module", "Allen NCR", "Allen Race", "Allen Extra Edge"],
		chapters: [
			"The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom", "Morphology of Flowering Plants",
			"Anatomy of Flowering Plants", "Structural Organisation in Animals", "Cell-The Unit of Life", "Biomolecules",
			"Cell Cycle and Cell Division", "Transport in Plants", "Mineral Nutrition", "Photosynthesis", "Respiration in Plants",
			"Plant Growth and Development", "Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation",
			"Excretory Products and their Elimination", "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination and Integration"
		]
	}
};

// load or initialize storage model
let model = loadModel();

// DOM refs
const contentArea = document.getElementById("content-area");
const tabs = document.querySelectorAll(".tab");
let activeSub = "physics";

// tab switching
tabs.forEach(btn => {
	btn.addEventListener("click", () => {
		tabs.forEach(t => t.classList.remove("active"));
		btn.classList.add("active");
		activeSub = btn.dataset.sub;
		renderActive();
	});
});

// ---------- STORAGE & MIGRATION ----------
function loadModel() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		// build full model from initial: populate chapters as objects with book keys set false
		const m = {};
		Object.keys(initial).forEach(sub => {
			m[sub] = { coreBooks: [...initial[sub].coreBooks], allenBooks: [...initial[sub].allenBooks], chapters: [] };
			initial[sub].chapters.forEach(ch => {
				m[sub].chapters.push(buildEmptyChapter(ch, m[sub].coreBooks, m[sub].allenBooks));
			});
		});
		localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
		return m;
	}
	try {
		const parsed = JSON.parse(raw);
		// if old simplified format detected, you could migrate here (not required)
		// ensure structure is correct; add missing keys if needed
		["physics", "chemistry", "biology"].forEach(sub => {
			if (!parsed[sub]) {
				parsed[sub] = { coreBooks: initial[sub].coreBooks.slice(), allenBooks: initial[sub].allenBooks.slice(), chapters: [] };
			} else {
				parsed[sub].coreBooks = parsed[sub].coreBooks || initial[sub].coreBooks.slice();
				parsed[sub].allenBooks = parsed[sub].allenBooks || initial[sub].allenBooks.slice();
				// convert chapters if string array to objects
				if (parsed[sub].chapters && parsed[sub].chapters.length && typeof parsed[sub].chapters[0] === "string") {
					const old = parsed[sub].chapters.slice();
					parsed[sub].chapters = old.map(ch => buildEmptyChapter(ch, parsed[sub].coreBooks, parsed[sub].allenBooks));
				} else if (!parsed[sub].chapters) {
					parsed[sub].chapters = [];
				} else {
					// ensure each chapter has both groups
					parsed[sub].chapters = parsed[sub].chapters.map(ch => normalizeChapter(ch, parsed[sub].coreBooks, parsed[sub].allenBooks));
				}
			}
		});
		localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
		return parsed;
	} catch (e) {
		console.error("Failed to parse storage, resetting", e);
		localStorage.removeItem(STORAGE_KEY);
		return loadModel();
	}
}

// helpers to build/normalize
function buildEmptyChapter(name, coreBooks, allenBooks) {
	const core = {}; const allen = {};
	coreBooks.forEach(b => core[b] = false);
	allenBooks.forEach(b => allen[b] = false);
	return { name, core, allen };
}
function normalizeChapter(existing, coreBooks, allenBooks) {
	const chapter = { name: existing.name || "Untitled", core: {}, allen: {} };
	coreBooks.forEach(b => chapter.core[b] = (existing.core && existing.core[b]) || false);
	allenBooks.forEach(b => chapter.allen[b] = (existing.allen && existing.allen[b]) || false);
	return chapter;
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); }

// ---------- APPLICABILITY HELPERS ----------
// decide whether a particular core book applies to a given chemistry chapter
function isBookApplicable(bookName, chapterName, subject) {
	if (subject !== "chemistry") return true; // applicability rules apply only to chemistry here
	const b = String(bookName).toLowerCase();
	const c = String(chapterName).trim();

	// Normalise common book name variants
	const isAwasthi = b.includes("awasthi");
	const isTandon = b.includes("tandon");

	if (isAwasthi) {
		return PHYSICAL_CHEM_CHAPTERS.includes(c);
	}
	if (isTandon) {
		return INORGANIC_CHEM_CHAPTERS.includes(c);
	}
	// other books apply everywhere by default
	return true;
}

// ---------- RENDERING ----------
function renderActive() {
	const sub = model[activeSub];
	contentArea.innerHTML = `
    <div class="subject-header">
      <div class="subject-title">
        <div class="badge ${activeSub}">${activeSub.charAt(0).toUpperCase() + activeSub.slice(1)}</div>
        <div>
          <div class="small-muted">Books groups (double-click a book name to rename)</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <div style="min-width:360px">
              <div class="small-muted">Core Books</div>
              <div id="coreBooksArea" class="book-summary"></div>
              <div style="margin-top:8px">
                <button class="add-core small-muted">+ Add core book</button>
              </div>
            </div>
            <div style="min-width:260px">
              <div class="small-muted">Allen Sub-Series</div>
              <div id="allenBooksArea" class="book-summary"></div>
              <div style="margin-top:8px">
                <button class="add-allen small-muted">+ Add Allen book</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="controls">
        <input id="newChapterInput" class="add-input" placeholder="New chapter name (or leave blank)" />
        <button id="addChapterBtn" class="small muted">+ Add chapter</button>
        <button id="clearAll" class="small muted">Reset Subject</button>
      </div>
    </div>

    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="chapter-col">Chapter</th>
              <th>Core Books (tick what is solved)</th>
              <th>Allen Sub-Series (tick)</th>
              <th style="width:110px;text-align:center">Completed</th>
              <th style="width:120px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody id="chapRows"></tbody>
        </table>
      </div>

      <div id="overallSummary" style="margin-top:10px"></div>
      <div class="footer-note">Tip: double-click chapter name to edit. Use book pills to rename or delete a book.</div>
    </div>
  `;

	// render book pills and table
	renderBookPills();
	renderTableRows();
	bindControls();
}

// render book pills for core & allen with progress bars and rename/delete
function renderBookPills() {
	const sub = model[activeSub];
	const coreArea = document.getElementById("coreBooksArea");
	const allenArea = document.getElementById("allenBooksArea");
	coreArea.innerHTML = ""; allenArea.innerHTML = "";

	// per-book progress
	function bookProgress(bookName, group) {
		const chapters = sub.chapters || [];
		// only count chapters where this book applies
		const applicableChapters = chapters.filter(ch => isBookApplicable(bookName, ch.name, activeSub));
		if (!applicableChapters.length) return 0;
		const count = applicableChapters.filter(ch => (group === "core" ? ch.core[bookName] : ch.allen[bookName])).length;
		return Math.round((count / applicableChapters.length) * 100);
	}

	sub.coreBooks.forEach(b => {
		const p = bookProgress(b, "core");
		const el = document.createElement("div");
		el.className = "book-pill";
		el.innerHTML = `<div>
        <div class="book-title editable" data-book="${b}" data-group="core">${b}</div>
        <div class="small-muted">${p}%</div>
      </div>
      <div class="book-actions">
        <div class="progress-line" style="width:120px"><i style="width:${p}%"></i></div>
        <div>
          <button title="Delete book" class="icon-btn delete-book" data-book="${b}" data-group="core">🗑️</button>
        </div>
      </div>`;
		coreArea.appendChild(el);
	});

	sub.allenBooks.forEach(b => {
		const p = bookProgress(b, "allen");
		const el = document.createElement("div");
		el.className = "book-pill";
		el.innerHTML = `<div>
        <div class="book-title editable" data-book="${b}" data-group="allen">${b}</div>
        <div class="small-muted">${p}%</div>
      </div>
      <div class="book-actions">
        <div class="progress-line" style="width:120px"><i style="width:${p}%"></i></div>
        <div>
          <button title="Delete book" class="icon-btn delete-book" data-book="${b}" data-group="allen">🗑️</button>
        </div>
      </div>`;
		allenArea.appendChild(el);
	});

	// overall summary area (per-book totals)
	const overall = document.getElementById("overallSummary");
	overall.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"></div>`;
	const wrap = overall.firstElementChild;
	sub.coreBooks.concat(sub.allenBooks).forEach(b => {
		const p = bookProgress(b, sub.coreBooks.includes(b) ? "core" : "allen");
		const pill = document.createElement("div");
		pill.className = "book-pill";
		pill.style.minWidth = "160px";
		pill.innerHTML = `<div class="book-title">${b}</div>
                      <div style="width:110px"><div class="progress-line"><i style="width:${p}%"></i></div></div>
                      <div class="small-muted">${p}%</div>`;
		wrap.appendChild(pill);
	});

	// attach rename & delete handlers
	document.querySelectorAll(".book-title.editable").forEach(el => {
		el.addEventListener("dblclick", () => {
			const book = el.dataset.book; const group = el.dataset.group;
			const newName = prompt("Rename book:", book);
			if (newName && newName.trim()) {
				renameBook(group, book, newName.trim());
			}
		});
	});
	document.querySelectorAll(".delete-book").forEach(btn => {
		btn.addEventListener("click", () => {
			const book = btn.dataset.book, group = btn.dataset.group;
			if (!confirm(`Delete book "${book}" from ${activeSub}? This will remove records for all chapters.`)) return;
			deleteBook(group, book);
		});
	});
}

// render table rows with checkboxes
function renderTableRows() {
	const sub = model[activeSub];
	const tbody = document.getElementById("chapRows");
	tbody.innerHTML = "";
	sub.chapters.forEach((ch, idx) => {
		// compute per-chapter applicable book count
		const applicableCoreBooks = sub.coreBooks.filter(b => isBookApplicable(b, ch.name, activeSub));
		const totalApplicable = applicableCoreBooks.length + sub.allenBooks.length;
		const checkedCount = applicableCoreBooks.reduce((a, b) => a + (ch.core[b] ? 1 : 0), 0) + sub.allenBooks.reduce((a, b) => a + (ch.allen[b] ? 1 : 0), 0);
		const percent = totalApplicable ? Math.round((checkedCount / totalApplicable) * 100) : 0;

		const tr = document.createElement("tr");
		tr.innerHTML = `
      <td class="chapter-cell">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-weight:700;min-width:28px;color:var(--muted)">#${idx + 1}</div>
          <div class="chapter-name" data-idx="${idx}">${escapeHtml(ch.name)}</div>
        </div>
      </td>
      <td>
        <div></div>
      </td>
      <td>
        <div></div>
      </td>
      <td style="text-align:center"><div class="progress-line" style="width:90px;margin:0 auto"><i style="width:${percent}%"></i></div><div class="small-muted">${percent}%</div></td>
      <td style="text-align:center" class="actions">
        <button class="icon-btn edit-chapter" title="Edit chapter">✏️</button>
        <button class="icon-btn delete-chapter" title="Delete chapter">🗑️</button>
      </td>
    `;
		// populate core checkboxes (only for applicable core books for this chapter)
		const coreCell = tr.children[1].firstElementChild;
		sub.coreBooks.forEach(book => {
			if (!isBookApplicable(book, ch.name, activeSub)) return; // skip book for this chapter
			const cb = document.createElement("label");
			cb.className = "book-checkbox";
			cb.innerHTML = `<input type="checkbox" data-group="core" data-book="${escapeAttr(book)}" data-idx="${idx}" ${ch.core[book] ? "checked" : ""}/> <span style="font-size:12px;color:var(--muted)">${book}</span>`;
			coreCell.appendChild(cb);
		});
		// populate allen checkboxes
		const allenCell = tr.children[2].firstElementChild;
		sub.allenBooks.forEach(book => {
			const cb = document.createElement("label");
			cb.className = "book-checkbox";
			cb.innerHTML = `<input type="checkbox" data-group="allen" data-book="${escapeAttr(book)}" data-idx="${idx}" ${ch.allen[book] ? "checked" : ""}/> <span style="font-size:12px;color:var(--muted)">${book}</span>`;
			allenCell.appendChild(cb);
		});

		tbody.appendChild(tr);
	});

	// attach events: checkbox toggles, edit/delete chapter, edit name on dblclick
	document.querySelectorAll('input[type="checkbox"][data-idx]').forEach(cb => {
		cb.addEventListener("change", (e) => {
			const idx = +cb.dataset.idx;
			const group = cb.dataset.group;
			const book = cb.dataset.book;
			model[activeSub].chapters[idx][group][book] = cb.checked;
			persist(); renderActive(); // re-render to update progress bars
		});
	});

	document.querySelectorAll(".delete-chapter").forEach((btn, i) => {
		btn.addEventListener("click", () => {
			const idx = +btn.closest("tr").querySelector(".chapter-name").dataset.idx;
			if (!confirm("Delete this chapter?")) return;
			model[activeSub].chapters.splice(idx, 1);
			persist(); renderActive();
		});
	});

	document.querySelectorAll(".edit-chapter").forEach(btn => {
		btn.addEventListener("click", () => {
			const idx = +btn.closest("tr").querySelector(".chapter-name").dataset.idx;
			const cur = model[activeSub].chapters[idx].name;
			const v = prompt("Edit chapter name:", cur);
			if (v === null) return;
			model[activeSub].chapters[idx].name = v.trim() || cur;
			persist(); renderActive();
		});
	});

	// double-click chapter name to rename
	document.querySelectorAll(".chapter-name").forEach(el => {
		el.addEventListener("dblclick", () => {
			const idx = +el.dataset.idx;
			const cur = model[activeSub].chapters[idx].name;
			const v = prompt("Edit chapter name:", cur);
			if (v === null) return;
			model[activeSub].chapters[idx].name = v.trim() || cur;
			persist(); renderActive();
		});
	});
}

// ---------- BOOK OPERATIONS ----------
function addCoreBook() {
	const name = prompt("Add Core book name:");
	if (!name) return;
	const sub = model[activeSub];
	if (sub.coreBooks.includes(name)) return alert("Book already exists.");
	sub.coreBooks.push(name);
	// add false for all chapters
	sub.chapters.forEach(ch => ch.core[name] = false);
	persist(); renderActive();
}
function addAllenBook() {
	const name = prompt("Add Allen book name:");
	if (!name) return;
	const sub = model[activeSub];
	if (sub.allenBooks.includes(name)) return alert("Book already exists.");
	sub.allenBooks.push(name);
	sub.chapters.forEach(ch => ch.allen[name] = false);
	persist(); renderActive();
}
function renameBook(group, oldName, newName) {
	const sub = model[activeSub];
	const arr = group === "core" ? sub.coreBooks : sub.allenBooks;
	const i = arr.indexOf(oldName);
	if (i === -1) return;
	arr[i] = newName;
	// update chapters object keys
	sub.chapters.forEach(ch => {
		if (group === "core") {
			ch.core[newName] = ch.core[oldName] || false;
			delete ch.core[oldName];
		} else {
			ch.allen[newName] = ch.allen[oldName] || false;
			delete ch.allen[oldName];
		}
	});
	persist(); renderActive();
}
function deleteBook(group, bookName) {
	const sub = model[activeSub];
	if (group === "core") {
		sub.coreBooks = sub.coreBooks.filter(b => b !== bookName);
		sub.chapters.forEach(ch => delete ch.core[bookName]);
	} else {
		sub.allenBooks = sub.allenBooks.filter(b => b !== bookName);
		sub.chapters.forEach(ch => delete ch.allen[bookName]);
	}
	persist(); renderActive();
}

// ---------- CHAPTER OPERATIONS ----------
function addChapter() {
	const input = document.getElementById("newChapterInput");
	let name = input.value.trim();
	if (!name) name = prompt("Chapter name:", "New Chapter") || "New Chapter";
	const sub = model[activeSub];
	sub.chapters.push(buildEmptyChapter(name, sub.coreBooks, sub.allenBooks));
	input.value = "";
	persist(); renderActive();
}
function clearSubject() {
	if (!confirm("Reset all chapters and records for this subject?")) return;
	const sub = model[activeSub];
	sub.chapters = [];
	persist(); renderActive();
}

// ---------- BIND CONTROLS ----------
function bindControls() {
	document.querySelector(".add-core").onclick = addCoreBook;
	document.querySelector(".add-allen").onclick = addAllenBook;
	document.getElementById("addChapterBtn").onclick = addChapter;
	document.getElementById("newChapterInput").addEventListener("keypress", e => {
		if (e.key === "Enter") addChapter();
	});
	document.getElementById("clearAll").onclick = clearSubject;
}

// util: escape html for safety
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

// initial render
renderActive();
