// Renders the Store screenshots (2000 x 1250 PNG, the size Raycast documents) from demo data.
//
// The data comes from the extension's own code talking to the mock helper (collect.ts with
// test/fixtures/demo.json); the window around it is an HTML rendition of Raycast's dark theme,
// because Raycast itself only runs on a Mac. Before submitting, retake them on a Mac with
// Raycast's Window Capture (see docs/research/raycast-store.md); this script is the stand-in
// that keeps the set reviewable and the demo data consistent.
//
//   NODE_PATH="$(npm root -g)" node dev/screenshots/render.mjs [--out metadata] [--captions]
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The demo business sits in Germany; times read as they would on its Mac.
process.env.TZ = "Europe/Berlin";
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const out = join(root, option("--out", "metadata"));

// Bundle collect.ts with the esbuild that @raycast/api already brings along.
const esbuild = require(require.resolve("esbuild", { paths: [join(root, "node_modules", "@raycast", "api")] }));
const bundle = join(mkdtempSync(join(tmpdir(), "folnaro-shots-")), "collect.cjs");
await esbuild.build({ entryPoints: [join(root, "dev/screenshots/collect.ts")], bundle: true, platform: "node", format: "cjs", outfile: bundle, logLevel: "error" });
const { collect } = require(bundle);
// A fixed "now" keeps the running timer at the same minute in every run.
const data = await collect(root, "en-US", new Date("2026-10-09T09:59:00+02:00"));
const t = data.t;

const { chromium } = require("playwright");
const iconData = (file) => `data:image/png;base64,${readFileSync(join(root, "assets", file)).toString("base64")}`;
const extensionIcon = iconData("extension-icon.png");

// MARK: - Glyphs (stroke icons in the spirit of Raycast's icon set)

const G = {
  invoice: '<path d="M6 3h9l3 3v15l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21z"/><path d="M9 9h6M9 13h6"/>',
  quote: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
  building: '<path d="M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M3 21h18"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  stopwatch: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2h4M18.5 6.5l1.5-1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  clip: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  app: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18"/>',
};
const glyph = (name, color = "#72DED9", size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${G[name]}</svg>`;
const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// MARK: - Page chrome

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; width: 1000px; height: 625px; overflow: hidden; }
body {
  font-family: -apple-system, "SF Pro Text", Inter, sans-serif; -webkit-font-smoothing: antialiased; color: #F4F4F5;
  background: radial-gradient(120% 90% at 18% 12%, #1F7F8C 0%, #0F4A57 38%, #0A2A33 70%, #071C22 100%);
}
.window { position: absolute; left: 125px; top: 70px; width: 750px; height: 475px; border-radius: 12px; overflow: hidden;
  background: rgba(30, 31, 34, 0.96); border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(0,0,0,0.6); display: flex; flex-direction: column; }
.searchbar { height: 56px; display: flex; align-items: center; padding: 0 16px; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); flex: none; }
.searchbar .text { flex: 1; font-size: 16px; color: #F4F4F5; }
.searchbar .placeholder { color: #8B8B90; }
.back { width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.08); display: grid; place-items: center; }
.dropdown { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #D4D4D8; padding: 5px 8px 5px 10px; border-radius: 6px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08); }
.body { flex: 1; display: flex; min-height: 0; }
.list { flex: 1; padding: 6px 8px; overflow: hidden; }
.list.narrow { flex: 0 0 40%; border-right: 1px solid rgba(255,255,255,0.08); }
.section { font-size: 12px; font-weight: 600; color: #8B8B90; padding: 10px 8px 6px; }
.row { height: 40px; display: flex; align-items: center; gap: 10px; padding: 0 8px; border-radius: 8px; font-size: 14px; }
.row.selected { background: rgba(255,255,255,0.09); }
.row .icon { width: 20px; display: grid; place-items: center; flex: none; }
.row .title { color: #F4F4F5; white-space: nowrap; }
.row .subtitle { color: #8B8B90; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.row .acc { display: flex; align-items: center; gap: 12px; color: #A1A1AA; font-size: 13px; white-space: nowrap; flex: none; }
.row .acc span { display: inline-flex; align-items: center; gap: 5px; }
.tag { display: inline-flex; align-items: center; color: #D4D4D8; }
.actionbar { height: 40px; flex: none; display: flex; align-items: center; padding: 0 10px 0 14px; gap: 10px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025); font-size: 13px; color: #A1A1AA; }
.actionbar img { width: 16px; height: 16px; border-radius: 4px; }
.actionbar .spacer { flex: 1; }
.actionbar .primary { color: #F4F4F5; font-weight: 500; }
.kbd { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,0.1); color: #D4D4D8; font-size: 12px; }
.divider { width: 1px; height: 16px; background: rgba(255,255,255,0.12); }
.detail { flex: 1; padding: 16px 20px; overflow: hidden; }
.meta { display: grid; grid-template-columns: 38% 62%; row-gap: 11px; font-size: 13px; }
.meta .k { color: #8B8B90; }
.meta .v { color: #F4F4F5; }
.meta .sep { grid-column: 1 / 3; height: 1px; background: rgba(255,255,255,0.08); margin: 2px 0; }
.form { flex: 1; padding: 18px 28px 0 0; overflow: hidden; }
.field { display: grid; grid-template-columns: 34% 66%; align-items: center; gap: 14px; margin-bottom: 11px; font-size: 13px; }
.field .label { text-align: right; color: #D4D4D8; }
.input { height: 28px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 0 10px; display: flex; align-items: center; justify-content: space-between; color: #F4F4F5; width: 92%; }
.input.focus { border-color: #72DED9; box-shadow: 0 0 0 3px rgba(114,222,217,0.25); }
.input .ph { color: #6B6B70; }
.desc { grid-column: 2; color: #A1A1AA; font-size: 12.5px; line-height: 1.45; width: 92%; }
.formsep { height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0 14px 34%; width: 60%; }
.caption { position: absolute; left: 0; right: 0; bottom: 26px; text-align: center; font-size: 15px; color: rgba(255,255,255,0.75); font-weight: 500; letter-spacing: 0.01em; }
`;

// Raycast's own captures carry no text around the window; `--captions` adds a line for previews.
const captions = args.includes("--captions");
function page(inner, caption = "") {
  const line = captions && caption ? `<div class="caption">${esc(caption)}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${inner}${line}</body></html>`;
}

function windowFrame({ search, placeholder, dropdown, back, body, command, primary, primaryKey = "↵" }) {
  return `<div class="window">
    <div class="searchbar">
      ${back ? `<div class="back">${glyph("back", "#D4D4D8", 14)}</div>` : ""}
      <div class="text">${search ? esc(search) : `<span class="placeholder">${esc(placeholder)}</span>`}</div>
      ${dropdown ? `<div class="dropdown">${esc(dropdown)} ${glyph("chevron", "#A1A1AA", 12)}</div>` : ""}
    </div>
    <div class="body">${body}</div>
    <div class="actionbar"><img src="${extensionIcon}"><span>${esc(command)}</span><span class="spacer"></span>
      <span class="primary">${esc(primary)}</span><span class="kbd">${primaryKey}</span><span class="divider"></span>
      <span>Actions</span><span class="kbd">⌘</span><span class="kbd">K</span></div>
  </div>`;
}

// Status as text with a tinted dot, as the extension shows it (no capsules behind text).
const tag = (text, color) =>
  `<span class="tag"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>${esc(text)}</span>`;

function row(item, { selected = false, narrow = false } = {}) {
  const acc = [];
  if (!narrow) {
    if (item.clip) acc.push(`<span>${glyph("clip", "#A1A1AA", 14)}</span>`);
    if (item.due) acc.push(`<span>${item.kind === "cart" ? "" : glyph("calendar", "#A1A1AA", 14)}${esc(item.due)}</span>`);
    if (item.amount) acc.push(`<span>${esc(item.amount)}</span>`);
  }
  if (item.status) acc.push(tag(item.status, item.color));
  if (item.tagText) acc.push(`<span>${esc(item.tagText)}</span>`);
  return `<div class="row${selected ? " selected" : ""}"><div class="icon">${glyph(item.kind)}</div>
    <span class="title">${esc(item.title)}</span>${narrow ? "<span class=subtitle></span>" : `<span class="subtitle">${esc(item.subtitle ?? "")}</span>`}
    <div class="acc">${acc.join("")}</div></div>`;
}

// MARK: - Screens

const search = data.search.sections;
const invoices = search[0];

function searchScreen() {
  let budget = 9; // rows that fit
  const blocks = [];
  for (const section of search) {
    if (budget <= 0) break;
    const rows = section.rows.slice(0, Math.min(section.rows.length, section === invoices ? 4 : 2, budget));
    budget -= rows.length + 0.6;
    blocks.push(`<div class="section">${esc(section.title)}</div>${rows.map((item, index) => row(item, { selected: section === invoices && index === 0 })).join("")}`);
  }
  return page(
    windowFrame({ placeholder: t["search.placeholder"], dropdown: t["search.scope.all"], body: `<div class="list">${blocks.join("")}</div>`, command: "Search Folnaro", primary: t["action.openInFolnaro"] }),
    "Invoices, quotes, customers and receipts with status, amount and due date",
  );
}

function detailScreen() {
  const selected = invoices.rows[1];
  const list = invoices.rows.map((item, index) => row(item, { selected: index === 1, narrow: true })).join("");
  const meta = selected.detail
    .map(([key, value]) => (key === "-" ? `<div class="sep"></div>` : key === t["field.status"] ? "" : `<div class="k">${esc(key)}</div><div class="v">${esc(value)}</div>`))
    .join("");
  const status = `<div class="k">${esc(t["field.status"])}</div><div class="v">${tag(selected.status, selected.color)}</div>`;
  return page(
    windowFrame({
      search: "RE-2026",
      dropdown: "Invoices",
      body: `<div class="list narrow"><div class="section">${esc(invoices.title)}</div>${list}</div><div class="detail"><div class="meta">${status}${meta}</div></div>`,
      command: "Search Folnaro",
      primary: t["action.quickLookPdf"],
      primaryKey: "⌘Y",
    }),
    "Details at a glance, the PDF in Quick Look",
  );
}

function timerScreen() {
  const r = data.timer.running;
  const rows = [
    `<div class="section">${esc(t["timer.section.running"])}</div>`,
    row({ kind: "stopwatch", title: r.title, subtitle: r.subtitle, due: "", amount: r.since, tagText: r.elapsed }, {}),
    `<div class="section">${esc(t["timer.section.recent"])}</div>`,
    ...data.timer.recents.slice(0, 4).map((item, index) => row({ kind: "clock", title: item.title, subtitle: item.subtitle }, { selected: index === 0 })),
    `<div class="section">${esc(t["timer.section.projects"])}</div>`,
    ...data.timer.projects.slice(0, 2).map((item) => row({ kind: "folder", title: item.title, subtitle: item.subtitle, amount: item.number })),
  ];
  return page(
    windowFrame({ placeholder: t["timer.placeholder"], body: `<div class="list">${rows.join("")}</div>`, command: "Start Timer", primary: t["timer.stopAndStart"] }),
    "Start the timer, recent projects first",
  );
}

function menuBarScreen() {
  const r = data.timer.running;
  const item = (text, opts = {}) =>
    `<div style="display:flex;align-items:center;gap:8px;height:24px;padding:0 10px;margin:0 5px;border-radius:5px;font-size:13px;${opts.selected ? "background:#0A6E7A;color:#fff;" : `color:${opts.dim ? "#8B8B90" : "#F4F4F5"};`}">
      ${opts.icon ? glyph(opts.icon, opts.selected ? "#fff" : "#D4D4D8", 15) : '<span style="width:15px"></span>'}<span style="flex:1">${esc(text)}</span>${opts.key ? `<span style="color:${opts.selected ? "#E5F7F6" : "#8B8B90"}">${opts.key}</span>` : ""}</div>`;
  const sep = '<div style="height:1px;background:rgba(255,255,255,0.1);margin:5px 10px"></div>';
  const inner = `
    <div style="position:absolute;left:0;right:0;top:0;height:30px;background:rgba(20,22,25,0.55);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:flex-end;gap:18px;padding:0 18px;font-size:13.5px;color:#F4F4F5;font-weight:500">
      <span style="display:flex;align-items:center;gap:5px;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,0.18)">${glyph("stopwatch", "#72DED9", 15)}${esc(r.clock)}</span>
      <span>Thu Oct 9&nbsp;&nbsp;09:59</span>
    </div>
    <div style="position:absolute;right:120px;top:36px;width:300px;padding:5px 0;border-radius:10px;background:rgba(36,38,42,0.97);border:1px solid rgba(255,255,255,0.12);box-shadow:0 18px 50px rgba(0,0,0,0.5)">
      ${item(r.title, { icon: "stopwatch" })}
      ${item(r.subtitle, { dim: true })}
      ${item(r.since, { dim: true })}
      ${item(t["menu.stop"], { icon: "stop", key: "⌘.", selected: true })}
      ${sep}
      ${item(t["menu.start"], { icon: "stopwatch", key: "⌘N" })}
      ${item(t["menu.openFolnaro"], { icon: "app", key: "⌘O" })}
    </div>`;
  return page(inner, "The running timer in the menu bar");
}

function field(label, content, opts = {}) {
  return `<div class="field"><div class="label">${esc(label)}</div><div class="input${opts.focus ? " focus" : ""}">${content}${opts.dropdown ? glyph("chevron", "#A1A1AA", 12) : ""}</div></div>`;
}
const ph = (text) => `<span class="ph">${esc(text)}</span>`;

function draftScreen() {
  const body = `<div class="form">
    <div class="field"><div></div><div class="desc">${esc(t["draft.info"])}</div></div>
    ${field(t["draft.customer"], esc(data.customers[0]), { dropdown: true })}
    ${field(t["draft.project"], "Website-Relaunch", { dropdown: true })}
    ${field(t["draft.title"], "Website relaunch, phase 3")}
    ${field(t["draft.serviceStart"], "Oct 1, 2026")}
    ${field(t["draft.serviceEnd"], "Oct 31, 2026")}
    <div class="formsep"></div>
    ${field(t["draft.lineTitle"], "Design and build of the home page", { focus: true })}
    ${field(t["draft.quantity"], "24")}
    ${field(t["draft.unit"], esc(t["unit.HUR"]), { dropdown: true })}
    ${field(t["draft.unitPrice"], "95.00")}
  </div>`;
  return page(
    windowFrame({ back: true, placeholder: "", body, command: "Create Invoice Draft", primary: t["draft.submit"], primaryKey: "⌘↵" }),
    "An invoice draft in seconds, Folnaro does the math",
  );
}

function receiptScreen() {
  const body = `<div class="form">
    <div class="field"><div></div><div class="desc">${esc(t["receipt.info"])}</div></div>
    ${field(t["receipt.file"], `${glyph("invoice", "#72DED9", 15)}<span style="flex:1;margin-left:8px">2026-10-07_Papeterie_Nord.pdf</span>`)}
    ${field(t["receipt.vendor"], "Papeterie Nord")}
    ${field(t["receipt.amount"], "35.70", { focus: true })}
    ${field(t["receipt.date"], "Oct 7, 2026")}
    ${field(t["receipt.category"], esc(t["category.office"]), { dropdown: true })}
    ${field(t["receipt.note"], "Sketchbooks")}
  </div>`;
  return page(
    windowFrame({ back: true, placeholder: "", body, command: "Capture Receipt", primary: t["receipt.submit"], primaryKey: "⌘↵" }),
    "A receipt from Finder straight into the receipt inbox",
  );
}

const SCREENS = [
  ["folnaro-1.png", searchScreen],
  ["folnaro-2.png", detailScreen],
  ["folnaro-3.png", timerScreen],
  // No menu bar shot: the store's metadata check accepts only Raycast window captures.
  ["folnaro-4.png", draftScreen],
  ["folnaro-5.png", receiptScreen],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 2 });
const pageHandle = await context.newPage();
for (const [file, render] of SCREENS) {
  const html = join(mkdtempSync(join(tmpdir(), "folnaro-shot-")), "index.html");
  writeFileSync(html, render());
  await pageHandle.goto(pathToFileURL(html).href);
  await pageHandle.screenshot({ path: join(out, file) });
  console.log("wrote", join(out, file));
}
await browser.close();
