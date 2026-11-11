import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseWindows, parseWorkspaces } from "../src/parse.ts";
import { stripColumns, stripImage } from "../src/strip.ts";
import { formatShortcut } from "../src/shortcut.ts";
import { suggestions } from "../src/suggest.ts";

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const windows = parseWindows(fixture("list-windows.json"));
const workspaces = parseWorkspaces(fixture("list-workspaces.json"));

test("strip columns follow column and row, skipping floating windows", () => {
  const stacked = [
    { id: 1, appName: "A", title: "", focused: false, workspace: { id: "w", position: 1 }, column: 2, row: 2 },
    { id: 2, appName: "B", title: "", focused: false, workspace: { id: "w", position: 1 }, column: 2, row: 1 },
    { id: 3, appName: "C", title: "", focused: false, workspace: { id: "w", position: 1 }, column: 1, row: 1 },
    { id: 4, appName: "D", title: "", focused: false, workspace: { id: "w", position: 1 } },
  ];
  assert.deepEqual(
    stripColumns(stacked, "w").map((column) => column.map((window) => window.id)),
    [[3], [2, 1]],
  );
});

test("the strip image draws one tile per tiled window and highlights one", () => {
  const image = stripImage(windows, "dev", 2613, true);
  const svg = Buffer.from(image.match(/^!\[Strip\]\(data:image\/svg\+xml;base64,([^)]+)\)$/)![1], "base64").toString();
  assert.equal(svg.match(/<rect /g)?.length, 5); // the desk and four windows
  assert.equal(svg.match(/fill="#0A84FF"/g)?.length, 1);
  assert.equal(stripImage(windows, "tools", undefined, true), "");
});

test("search text becomes a command argument", () => {
  const titles = (query: string) => suggestions(query, workspaces).map((s) => [s.title, s.args.join(" ")]);
  assert.deepEqual(titles("60"), [["Set Column Width to 60%", "set-column-width 60%"]]);
  assert.deepEqual(titles("3"), [
    ["Go to dev-secondary", "--monitor 1 workspace dev-secondary"],
    ["Move Focused Window to dev-secondary", "move-window-to-workspace-name dev-secondary"],
  ]);
  assert.deepEqual(titles("7"), [["Set Column Width to 7%", "set-column-width 7%"]]);
  assert.deepEqual(titles("+10"), [["Widen Column by 10%", "set-column-width +10%"]]);
  assert.deepEqual(titles("-40pt"), [["Narrow Column by 40 pt", "set-column-width -40"]]);
  assert.deepEqual(titles("960"), [["Set Column Width to 960 pt", "set-column-width 960"]]);
  assert.deepEqual(titles("h50"), [["Set Window Height to 50%", "set-window-height 50%"]]);
  assert.deepEqual(titles("h-10"), [["Shrink Window by 10%", "set-window-height -10%"]]);
  // A partial name offers the two common actions, a word inside the name counts, one letter offers none.
  assert.deepEqual(titles("we"), [
    ["Go to web", "--monitor 1 workspace web"],
    ["Move Focused Window to web", "move-window-to-workspace-name web"],
  ]);
  assert.equal(titles("sec")[0][0], "Go to dev-secondary");
  assert.deepEqual(titles("w"), []);
  assert.deepEqual(
    titles("web").map(([title]) => title),
    [
      "Go to web",
      "Move Focused Window to web",
      "Send Focused Window to web",
      "Move Focused Column to web",
      "Send Focused Column to web",
    ],
  );
  assert.deepEqual(titles("zzz"), []);
  assert.deepEqual(titles("  "), []);
});

test("copied commands use the form [keys] accepts, and digit shortcuts only where Defi binds them", () => {
  const bindings = (query: string) => suggestions(query, workspaces).map((s) => s.binding);
  assert.deepEqual(bindings("web").slice(0, 2), ["workspace web", "move-window-to-workspace-name web"]);
  assert.deepEqual(bindings("5"), [
    "focus-workspace-position 5",
    "set-column-width 5%",
    "move-window-to-workspace-position 5",
  ]);
  // Named workspaces take mod-1 … mod-4 in an order the CLI does not report; position 5 follows them.
  const shortcuts = (query: string) => suggestions(query, workspaces).map((s) => s.shortcut);
  assert.deepEqual(shortcuts("2"), [undefined, undefined]);
  assert.deepEqual(shortcuts("5"), ["mod-5", undefined, undefined]);
  assert.deepEqual(
    suggestions("+10", workspaces).map((s) => s.hud),
    ["Widened column by 10%"],
  );
  assert.deepEqual(
    suggestions("h-10", workspaces).map((s) => s.hud),
    ["Shrank window by 10%"],
  );
});

test("shortcuts read as macOS glyphs with the default mod", () => {
  assert.equal(formatShortcut("mod-left"), "⌃⌥←");
  assert.equal(formatShortcut("mod-shift-comma"), "⌃⌥⇧,");
  assert.equal(formatShortcut("mod-shift-cmd-up"), "⌃⌥⇧⌘↑");
  assert.equal(formatShortcut("mod-f"), "⌃⌥F");
});
