// Generates metadata/*.png — the store screenshots.
//
// Two rules govern this file.
//
// 1. The rows come from the extension's OWN logic. This bundles src/lib and feeds it
//    a fixture config, so a screenshot cannot drift from what the extension actually
//    renders. Hand-written mock rows would go stale the first time a merge rule
//    changed, and nobody would notice until someone compared them by eye.
//
// 2. The data is fictional. Real screenshots of a real machine leak window titles,
//    project names, and client names into a public repo. The fixture below is a
//    plausible config and a plausible set of open windows, and nothing more.
//
// Output is 2000x1250 at 2x on one consistent opaque background, which is what the
// store specs ask for: they composite the image as-is and define no dark variant.

import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "metadata");
const TMP = join(HERE, ".screenshot-build");

const BROWSERS = [
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

// ---------------------------------------------------------------- fixture data
const FIXTURE_BINDINGS = {
  main: {
    "ctrl-alt-left": "focus left",
    "ctrl-alt-down": "focus down",
    "ctrl-alt-up": "focus up",
    "ctrl-alt-right": "focus right",
    "ctrl-alt-h": "focus left",
    "ctrl-alt-j": "focus down",
    "ctrl-alt-k": "focus up",
    "ctrl-alt-l": "focus right",
    "ctrl-alt-shift-left": "move left",
    "ctrl-alt-shift-down": "move down",
    "ctrl-alt-shift-up": "move up",
    "ctrl-alt-shift-right": "move right",
    "ctrl-alt-shift-h": "move left",
    "ctrl-alt-shift-l": "move right",
    "ctrl-alt-cmd-h": "join-with left",
    "ctrl-alt-cmd-j": "join-with down",
    "ctrl-alt-cmd-k": "join-with up",
    "ctrl-alt-cmd-l": "join-with right",
    "ctrl-alt-c": "layout --root h_tiles",
    "ctrl-alt-r": "layout --root v_tiles",
    "ctrl-alt-f": "flatten-workspace-tree",
    "ctrl-alt-b": "balance-sizes",
    "ctrl-alt-minus": "resize smart -50",
    "ctrl-alt-equal": "resize smart +50",
    "ctrl-alt-shift-minus": "resize width -50",
    "ctrl-alt-shift-equal": "resize width +50",
    "ctrl-alt-cmd-minus": "resize height -50",
    "ctrl-alt-cmd-equal": "resize height +50",
    "ctrl-alt-slash": "layout tiles horizontal vertical",
    "ctrl-alt-comma": "layout accordion horizontal vertical",
    "ctrl-alt-enter": "fullscreen",
    "ctrl-alt-space": "layout floating tiling",
    "ctrl-alt-tab": "workspace-back-and-forth",
    "ctrl-alt-cmd-left": "move-node-to-monitor --wrap-around prev",
    "ctrl-alt-cmd-right": "move-node-to-monitor --wrap-around next",
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`ctrl-alt-${n}`, `workspace ${n}`])),
    ...Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`ctrl-alt-shift-${n}`, `move-node-to-workspace ${n}`]),
    ),
  },
};

const FIXTURE_WORKSPACES = [
  { name: "1", apps: ["Safari", "Notes"], focused: true },
  { name: "2", apps: ["Xcode", "Simulator", "Terminal"], focused: false },
  { name: "3", apps: ["Figma"], focused: false },
  { name: "4", apps: ["Mail", "Calendar"], focused: false },
  { name: "5", apps: [], focused: false },
  { name: "6", apps: [], focused: false },
];

const FIXTURE_TOML = `# ~/.aerospace.toml
config-version = 2
start-at-login = true

enable-normalization-flatten-containers = true
enable-normalization-opposite-orientation-for-nested-containers = true

default-root-container-layout = 'tiles'
default-root-container-orientation = 'auto'

gaps.inner.horizontal = 8
gaps.inner.vertical   = 8

[mode.main.binding]
    ctrl-alt-left  = 'focus left'
    ctrl-alt-right = 'focus right'

    ctrl-alt-cmd-h = 'join-with left'
    ctrl-alt-cmd-l = 'join-with right'

    ctrl-alt-c = 'layout --root h_tiles'
    ctrl-alt-r = 'layout --root v_tiles'
    ctrl-alt-f = 'flatten-workspace-tree'`;

// ---------------------------------------------------------------- helpers
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function diagramSvg(name) {
  if (!name) return "";
  // Screenshots are dark theme, so pull the @dark twin the way Raycast would.
  try {
    return readFileSync(join(ROOT, "assets", "diagrams", `${name}@dark.svg`), "utf8").replace(/<\?xml[^>]*\?>\s*/, "");
  } catch {
    return "";
  }
}

/** Minimal toml highlighter, matching how Raycast renders a fenced code block. */
function highlightToml(src) {
  return esc(src)
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return `<span class="c-com">${line}</span>`;
      if (/^\s*\[/.test(line)) return `<span class="c-sec">${line}</span>`;
      return line
        .replace(/^(\s*[\w.-]+)(\s*=\s*)/, `<span class="c-key">$1</span>$2`)
        .replace(/(&#39;|')([^']*)(&#39;|')/g, `<span class="c-str">'$2'</span>`)
        .replace(/=\s*(true|false|\d+)$/, `= <span class="c-num">$1</span>`);
    })
    .join("\n");
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1000px;height:625px;overflow:hidden}
/* The backdrop is a real positioned element, not a body background. Chrome renders the
   page shorter than the requested window and pads the screenshot with white, so a
   viewport-dependent background left a white band along the bottom. */
.bg{position:fixed;top:0;left:0;width:1000px;height:625px;z-index:-1;
  background:radial-gradient(120% 120% at 50% 0%, #2f3340 0%, #1a1c24 55%, #101218 100%)}
body{display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,sans-serif;
  -webkit-font-smoothing:antialiased}
.win{width:750px;height:475px;background:#1c1c1e;border-radius:12px;overflow:hidden;
  display:flex;flex-direction:column;color:#fff;
  box-shadow:0 32px 80px rgba(0,0,0,.55),0 0 0 .5px rgba(255,255,255,.10)}
.search{height:52px;flex:0 0 52px;display:flex;align-items:center;gap:10px;padding:0 16px;
  border-bottom:1px solid rgba(255,255,255,.07)}
.search .ico{width:18px;height:18px;opacity:.45;flex:0 0 18px}
.search input{all:unset;flex:1;font-size:15px;color:#fff}
.search .ph{flex:1;font-size:15px;color:#6e6e73}
.search .drop{font-size:12px;color:#8e8e93;background:rgba(255,255,255,.07);
  padding:4px 9px;border-radius:6px;display:flex;align-items:center;gap:5px}
.body{flex:1;display:flex;min-height:0}
.list{width:333px;flex:0 0 333px;padding:8px;overflow:hidden}
.list.full{flex:1;width:auto}
.divider{width:1px;background:rgba(255,255,255,.07)}
.detail{flex:1;padding:16px 18px;overflow:hidden;font-size:12.5px;line-height:1.55;color:#c7c7cc}
.sec{font-size:11px;color:#8e8e93;padding:10px 8px 5px;display:flex;justify-content:space-between}
.sec .sub{color:#5a5a5f}
.row{height:36px;display:flex;align-items:center;gap:9px;padding:0 8px;border-radius:7px}
.row.sel{background:rgba(255,255,255,.08)}
.row .dot{width:15px;height:15px;border-radius:4px;flex:0 0 15px;display:flex;
  align-items:center;justify-content:center;font-size:9px;color:#fff}
.row .t{font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .s{font-size:12px;color:#8e8e93;flex:0 0 auto;max-width:150px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag{font-size:11.5px;padding:2.5px 7px;border-radius:5px;background:rgba(255,255,255,.09);
  color:#e5e5ea;white-space:nowrap;font-variant-numeric:tabular-nums}
.tag.alt{color:#7c7c81;background:rgba(255,255,255,.05)}
.tag.warn{color:#ff9f0a;background:rgba(255,159,10,.15)}
.acc{display:flex;gap:5px;align-items:center;flex:0 0 auto}
.detail h2{font-size:15px;font-weight:600;color:#fff;margin-bottom:8px}
.detail code{font-family:'SF Mono',ui-monospace,monospace;font-size:11.5px;
  background:rgba(255,255,255,.09);padding:2px 6px;border-radius:4px;color:#fff}
.detail p{margin-bottom:9px}
.detail .img{margin:10px 0 11px}
.detail ol{margin:4px 0 0 16px}
.detail ol li{margin-bottom:6px}
.meta{margin-top:11px;border-top:1px solid rgba(255,255,255,.07);padding-top:11px}
.meta .r{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
.meta .k{color:#8e8e93}
.meta .v{color:#e5e5ea;text-align:right;max-width:230px;
  font-family:'SF Mono',ui-monospace,monospace;font-size:11.5px}
.bar{height:40px;flex:0 0 40px;border-top:1px solid rgba(255,255,255,.07);
  display:flex;align-items:center;justify-content:flex-end;gap:16px;padding:0 14px;
  font-size:12px;color:#8e8e93}
.bar b{font-weight:400;color:#c7c7cc}
.kbd{background:rgba(255,255,255,.09);border-radius:4px;padding:1px 5px;
  font-size:11px;margin-left:5px;color:#c7c7cc}
pre{font-family:'SF Mono',ui-monospace,monospace;font-size:11px;line-height:1.6;
  background:rgba(255,255,255,.04);border-radius:8px;padding:12px;color:#c7c7cc;
  white-space:pre-wrap}
.form{flex:1;padding:20px 0;overflow:hidden}
.frow{display:flex;align-items:flex-start;padding:9px 22px;gap:18px}
.flabel{width:118px;flex:0 0 118px;text-align:right;font-size:13px;color:#8e8e93;padding-top:7px}
.fctl{flex:1}
.finput{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);
  border-radius:7px;padding:7px 11px;font-size:13px;color:#fff;min-height:33px}
.finput.ph{color:#5a5a5f}
.fhint{font-size:11.5px;color:#6e6e73;margin-top:6px;line-height:1.45}
.fstatic{font-size:13px;color:#e5e5ea;padding-top:7px}
.fsep{height:1px;background:rgba(255,255,255,.07);margin:13px 22px}
.c-com{color:#6e6e73}.c-sec{color:#ff9f0a}.c-key{color:#64d2ff}
.c-str{color:#a3e07a}.c-num{color:#d0a0ff}
`;

const SEARCH_ICON = `<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.6">
<circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg>`;

const GROUP_COLOR = {
  recipes: "#ffd60a",
  build: "#bf5af2",
  focus: "#0a84ff",
  move: "#30d158",
  resize: "#ff9f0a",
  layout: "#ff375f",
  workspaces: "#0a84ff",
  service: "#8e8e93",
  other: "#8e8e93",
};

/** Top-anchored crop via CoreGraphics, which is present on every Mac. */
const CROP = `
import sys, Quartz
path, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
url = Quartz.CFURLCreateFromFileSystemRepresentation(None, path.encode(), len(path), False)
img = Quartz.CGImageSourceCreateImageAtIndex(Quartz.CGImageSourceCreateWithURL(url, None), 0, None)
if Quartz.CGImageGetWidth(img) == w and Quartz.CGImageGetHeight(img) == h:
    sys.exit(0)
cropped = Quartz.CGImageCreateWithImageInRect(img, Quartz.CGRectMake(0, 0, w, h))
dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)
Quartz.CGImageDestinationAddImage(dest, cropped, None)
Quartz.CGImageDestinationFinalize(dest)
`;

function page(inner) {
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><div class="bg"></div>${inner}</body>`;
}

function chrome({ query, placeholder, dropdown, listHtml, detailHtml, fullWidth, primaryAction }) {
  return `<div class="win">
  <div class="search">${SEARCH_ICON}${
    query ? `<div class="ph" style="color:#fff">${esc(query)}</div>` : `<div class="ph">${esc(placeholder)}</div>`
  }${dropdown ? `<div class="drop">${esc(dropdown)} <span style="opacity:.5">⌄</span></div>` : ""}</div>
  <div class="body">
    <div class="list${fullWidth ? " full" : ""}">${listHtml}</div>
    ${fullWidth ? "" : `<div class="divider"></div><div class="detail">${detailHtml}</div>`}
  </div>
  <div class="bar"><b>${esc(primaryAction)}</b><span class="kbd">↵</span>
    <b style="margin-left:8px">Actions</b><span class="kbd">⌘K</span></div>
</div>`;
}

function sectionHtml(title, subtitle) {
  return `<div class="sec"><span>${esc(title)}</span>${subtitle ? `<span class="sub">${esc(subtitle)}</span>` : ""}</div>`;
}

function rowHtml({ title, subtitle, tags = [], color, selected, glyph }) {
  const acc = tags
    .map((t) => `<span class="tag${t.alternate ? " alt" : ""}${t.warn ? " warn" : ""}">${esc(t.text)}</span>`)
    .join("");
  return `<div class="row${selected ? " sel" : ""}">
    <span class="dot" style="background:${color}">${glyph ?? ""}</span>
    <span class="t">${esc(title)}</span>
    ${subtitle ? `<span class="s">${esc(subtitle)}</span>` : ""}
    <span class="acc">${acc}</span></div>`;
}

// ---------------------------------------------------------------- main
async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  // Bundle the extension's own logic, stubbing the Raycast API it imports for icons.
  const stub = join(TMP, "stub.js");
  writeFileSync(
    stub,
    `const h={get:(_t,p)=>String(p)};export const Color=new Proxy({},h);export const Icon=new Proxy({},h);\n`,
  );
  const entry = join(TMP, "entry.mjs");
  writeFileSync(
    entry,
    `export { buildRows } from "${join(ROOT, "src/lib/rows.ts").replace(/\\/g, "/")}";
export { GROUPS } from "${join(ROOT, "src/lib/dictionary.ts").replace(/\\/g, "/")}";
export { RECIPES, resolveRecipe } from "${join(ROOT, "src/lib/recipes.ts").replace(/\\/g, "/")}";\n`,
  );
  const bundlePath = join(TMP, "lib.mjs");
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
    alias: { "@raycast/api": stub },
    logLevel: "error",
  });
  const lib = await import(`file://${bundlePath}?v=${Date.now()}`);

  const bindings = Object.entries(FIXTURE_BINDINGS).flatMap(([mode, b]) =>
    Object.entries(b).map(([key, command]) => ({ mode, key, command, commands: command.split("; ") })),
  );
  const rows = lib.buildRows(bindings);
  const recipes = lib.RECIPES.map((r) => lib.resolveRecipe(r, bindings));
  const byGroup = (id) => rows.filter((r) => r.group === id);
  const find = (t) => rows.find((r) => r.title === t);

  const tagsFor = (row) => row.keys.map((k) => ({ text: k.display, alternate: k.alternate }));

  /** Renders the grouped list exactly as the extension orders it. */
  function cheatsheetList({ selectedTitle, selectedRecipe, groups, showRecipes = true, limit = 11 }) {
    let html = "";
    let count = 0;
    if (showRecipes) {
      html += sectionHtml("Recipes", "goal → keys");
      for (const r of recipes) {
        if (count >= limit) break;
        html += rowHtml({
          title: r.title,
          tags: [
            r.missing.length
              ? { text: "needs a binding", warn: true }
              : { text: `${r.steps.length} steps`, alternate: true },
          ],
          color: GROUP_COLOR.recipes,
          selected: r.title === selectedRecipe,
        });
        count++;
      }
    }
    for (const g of lib.GROUPS.filter((g) => g.id !== "recipes")) {
      if (groups && !groups.includes(g.id)) continue;
      const inGroup = byGroup(g.id);
      if (inGroup.length === 0 || count >= limit) continue;
      html += sectionHtml(g.title, g.subtitle);
      for (const row of inGroup) {
        if (count >= limit) break;
        html += rowHtml({
          title: row.title,
          tags: tagsFor(row),
          color: GROUP_COLOR[g.id],
          selected: row.title === selectedTitle,
        });
        count++;
      }
    }
    return html;
  }

  function recipeDetail(recipe, { storyboard = false } = {}) {
    const svg = diagramSvg(storyboard && recipe.storyboard ? recipe.storyboard : recipe.diagram);
    const steps = recipe.resolved
      .map((s) => `<li>${s.keys ? `<code>${esc(s.keys)}</code>: ` : ""}${esc(s.instruction)}</li>`)
      .join("");
    return `<h2>${esc(recipe.title)}</h2><div class="img">${svg}</div>
      <p>${esc(recipe.outcome)}</p><ol>${steps}</ol>`;
  }

  function rowDetail(row) {
    const keys = row.keys.map((k) => `<code>${esc(k.display)}</code>`).join(" ");
    const svg = diagramSvg(row.diagram);
    return `<h2>${esc(row.title)}</h2><p>${keys}</p>
      ${svg ? `<div class="img">${svg}</div>` : ""}
      ${row.blurb ? `<p>${esc(row.blurb)}</p>` : ""}
      ${row.teaches ? `<p>${esc(row.teaches)}</p>` : ""}
      <div class="meta">
        <div class="r"><span class="k">Keys</span><span class="acc">${row.keys
          .map((k) => `<span class="tag${k.alternate ? " alt" : ""}">${esc(k.display)}</span>`)
          .join("")}</span></div>
        <div class="r"><span class="k">Command</span><span class="v">${esc(row.command)}</span></div>
        <div class="r"><span class="k">Mode</span><span class="v">${esc(row.mode)}</span></div>
      </div>`;
  }

  // ---- scenes ----
  // Looked up by title, so this tracks the dictionary rather than a hardcoded string.
  const joinRight = find("Join right");
  if (!joinRight) throw new Error('No "Join right" row — has the dictionary label changed?');
  const searchRows = rows.filter((r) =>
    /join|flatten|balance|root axis/i.test(r.title) || /stack/i.test((r.keywords ?? []).join(" ")),
  );

  const scenes = [
    {
      name: "aerospace-cheatsheet-1",
      html: chrome({
        placeholder: "Search a key, a command, or what you want to do…",
        dropdown: "All groups",
        listHtml: cheatsheetList({ selectedRecipe: "Left strip + right stack" }),
        detailHtml: recipeDetail(recipes[0]),
        primaryAction: "Open Walkthrough",
      }),
    },
    {
      name: "aerospace-cheatsheet-2",
      html: chrome({
        placeholder: "Search a key, a command, or what you want to do…",
        dropdown: "All groups",
        listHtml: cheatsheetList({ selectedTitle: joinRight.title, showRecipes: false, limit: 11 }),
        detailHtml: rowDetail(joinRight),
        primaryAction: "Try It",
      }),
    },
    {
      name: "aerospace-cheatsheet-3",
      html: chrome({
        query: "stack",
        dropdown: "All groups",
        listHtml:
          sectionHtml("Recipes", "goal → keys") +
          rowHtml({
            title: recipes[0].title,
            tags: [{ text: "4 steps", alternate: true }],
            color: GROUP_COLOR.recipes,
            selected: true,
          }) +
          sectionHtml("Build layout", "shape the workspace") +
          searchRows
            .filter((r) => r.group === "build")
            .slice(0, 6)
            .map((r) => rowHtml({ title: r.title, tags: tagsFor(r), color: GROUP_COLOR.build }))
            .join("") +
          sectionHtml("Move window") +
          byGroup("move")
            .slice(0, 2)
            .map((r) => rowHtml({ title: r.title, tags: tagsFor(r), color: GROUP_COLOR.move }))
            .join(""),
        detailHtml: recipeDetail(recipes[0]),
        primaryAction: "Open Walkthrough",
      }),
    },
    {
      name: "aerospace-cheatsheet-4",
      html: `<div class="win">
        <div class="search">${SEARCH_ICON}<div class="ph">Left strip + right stack</div></div>
        <div class="body"><div class="detail" style="padding:20px 24px">
          ${recipeDetail(recipes[0], { storyboard: true })}
          <div class="meta">
            <div class="r"><span class="k">Keys used</span><span class="acc">${recipes[0].resolved
              .filter((s) => s.keys)
              .map((s) => `<span class="tag">${esc(s.keys)}</span>`)
              .join("")}</span></div>
            <div class="r"><span class="k">Steps</span><span class="v">${recipes[0].steps.length}</span></div>
          </div>
        </div></div>
        <div class="bar"><b>Copy Steps</b><span class="kbd">↵</span>
          <b style="margin-left:8px">Actions</b><span class="kbd">⌘K</span></div></div>`,
    },
    {
      name: "aerospace-cheatsheet-5",
      html: chrome({
        placeholder: "Jump to a workspace…",
        listHtml:
          sectionHtml("In use") +
          FIXTURE_WORKSPACES.filter((w) => w.apps.length)
            .map((w) =>
              rowHtml({
                title: w.name,
                subtitle: w.apps.join(", "),
                tags: [{ text: String(w.apps.length), alternate: true }],
                color: w.focused ? "#30d158" : "#48484a",
                selected: w.focused,
              }),
            )
            .join("") +
          sectionHtml("Empty") +
          FIXTURE_WORKSPACES.filter((w) => !w.apps.length)
            .map((w) => rowHtml({ title: w.name, color: "#48484a" }))
            .join(""),
        detailHtml: "",
        fullWidth: true,
        primaryAction: "Go to Workspace",
      }),
    },
    {
      name: "aerospace-cheatsheet-6",
      html: `<div class="win">
        <div class="search">${SEARCH_ICON}<div class="ph">Edit ⌃ ⌥ ⌘ L</div></div>
        <div class="body"><div class="form">
          <div class="frow"><div class="flabel">Mode</div><div class="fctl"><div class="fstatic">main</div></div></div>
          <div class="frow"><div class="flabel">Key</div><div class="fctl">
            <div class="finput">ctrl-alt-cmd-l</div>
            <div class="fhint">Written the way AeroSpace writes it: modifiers and the key joined by hyphens.</div>
          </div></div>
          <div class="frow"><div class="flabel">Reads as</div><div class="fctl"><div class="fstatic">⌃ ⌥ ⌘ L</div></div></div>
          <div class="frow"><div class="flabel">Command</div><div class="fctl">
            <div class="finput">join-with right</div>
            <div class="fhint">An AeroSpace command. Separate a sequence with a semicolon; it is saved as a toml array.</div>
          </div></div>
          <div class="frow"><div class="flabel">Recognized as</div><div class="fctl">
            <div class="fstatic">Join with the window to its right</div></div></div>
          <div class="fsep"></div>
          <div class="frow"><div class="flabel">Before saving</div><div class="fctl">
            <div class="fhint" style="margin-top:7px">The change is re-parsed, then applied and checked with
            reload-config. If AeroSpace rejects it your config is put back exactly as it was.</div></div></div>
        </div></div>
        <div class="bar"><b>Save Binding</b><span class="kbd">↵</span>
          <b style="margin-left:8px">Actions</b><span class="kbd">⌘K</span></div></div>`,
    },
  ];

  const browser = BROWSERS.find((b) => {
    try {
      readFileSync(b);
      return true;
    } catch {
      return false;
    }
  });
  if (!browser) throw new Error(`No Chromium-based browser found. Tried:\n  ${BROWSERS.join("\n  ")}`);

  for (const scene of scenes) {
    const htmlPath = join(TMP, `${scene.name}.html`);
    writeFileSync(htmlPath, page(scene.html), "utf8");
    await exec(browser, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
          // Opaque: the store composites these as-is and specifies no dark-mode variant,
      // so a transparent PNG would sit on an undefined backdrop.
      "--window-size=1000,706", // 625 + 81px of headless window chrome, measured
      "--force-device-scale-factor=2", // 2x -> the 2000x1250 the store expects
      `--screenshot=${join(OUT, `${scene.name}.png`)}`,
      `file://${htmlPath}`,
    ]);
    // Chrome reserves 81 CSS px of window chrome even in headless, so the window is
    // asked for 706 and the extra is cropped off the bottom. Measured, not guessed:
    // the unpainted region begins at exactly y=1250 in the 2x output.
    await exec("python3", ["-c", CROP, join(OUT, `${scene.name}.png`), "2000", "1250"]);
    console.log(`  ${scene.name}.png`);
  }

  rmSync(TMP, { recursive: true, force: true });
  console.log(`\nwrote ${scenes.length} screenshots to metadata/ (2000x1250, opaque, store spec)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
