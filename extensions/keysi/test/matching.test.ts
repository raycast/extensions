import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { matching, readSheetsIn, type Sheet } from "../src/lib/sheets.ts";

/**
 * Which sheet is about the app you were just in. Mirrors
 * `CustomSheetStore.matching` on Keysi's Swift side — a sheet that wins in
 * the overlay has to win here, or the two surfaces disagree about the same
 * files.
 */
const REPO_SHEETS = join(import.meta.dirname, "..", "..", "Keysi", "Resources", "BuiltinSheets");
const skip = existsSync(REPO_SHEETS) ? false : "not in the Keysi repo — bundled sheets are not vendored with the extension";

function sheet(id: string, match: Sheet["match"], priority?: number): Sheet {
  return { id, name: id, match, priority, groups: [] };
}

test("matches on bundle id", () => {
  const sheets = [sheet("figma", { bundleIDs: ["com.figma.Desktop"] }), sheet("slack", { bundleIDs: ["other"] })];
  assert.deepEqual(
    matching(sheets, { bundleId: "com.figma.Desktop", name: "Figma" }).map((s) => s.id),
    ["figma"],
  );
});

test("matches on the app's name, case-insensitively", () => {
  const sheets = [sheet("vim", { processNames: ["vim", "nvim"] })];
  assert.deepEqual(
    matching(sheets, { bundleId: "com.example.NVim", name: "NVim" }).map((s) => s.id),
    ["vim"],
  );
});

/** The bundle's filename is a second shot at the same thing. */
test("matches on the bundle's own filename", () => {
  const sheets = [sheet("vim", { processNames: ["nvim"] })];
  assert.deepEqual(
    matching(sheets, { name: "Neovide", path: "/Applications/nvim.app" }).map((s) => s.id),
    ["vim"],
  );
});

test("higher priority comes first", () => {
  const sheets = [
    sheet("low", { bundleIDs: ["com.example.App"] }, 0),
    sheet("high", { bundleIDs: ["com.example.App"] }, 5),
  ];
  assert.deepEqual(
    matching(sheets, { bundleId: "com.example.App" }).map((s) => s.id),
    ["high", "low"],
  );
});

/**
 * The launchers are the exclusion that is easy to get wrong — see
 * `TargetAppFilter` for why an `LSUIElement` agent still becomes the active
 * app. Whether Raycast reports itself here is Raycast's business and has
 * changed before; this makes the answer not matter.
 */
test("a launcher matches nothing", () => {
  const sheets = [sheet("raycast", { bundleIDs: ["com.raycast.macos"] })];
  assert.deepEqual(matching(sheets, { bundleId: "com.raycast.macos", name: "Raycast" }), []);
});

test("no frontmost app matches nothing", () => {
  assert.deepEqual(matching([sheet("vim", { processNames: ["vim"] })], undefined), []);
});

test("a sheet with no match rules is never the current app's", () => {
  assert.deepEqual(matching([sheet("loose", undefined)], { bundleId: "com.example.App", name: "App" }), []);
  assert.deepEqual(matching([sheet("empty", {})], { bundleId: "com.example.App", name: "App" }), []);
});

/** Against the real shipped sheets, so a `match` block edited away is caught. */
test("Figma's bundled sheet still matches Figma", { skip }, () => {
  const sheets = readSheetsIn(REPO_SHEETS);
  assert.deepEqual(
    matching(sheets, { bundleId: "com.figma.Desktop", name: "Figma" }).map((s) => s.id),
    ["figma"],
  );
});

/**
 * The honest limit. Keysi reads the processes running *inside* the frontmost
 * terminal, which is how its tmux sheet appears when you're in Ghostty; an
 * extension cannot see that, and guessing "it's a terminal, so probably
 * tmux" would reorder someone's list for no reason they can see.
 */
test("a terminal does not match the tmux sheet", { skip }, () => {
  const sheets = readSheetsIn(REPO_SHEETS);
  assert.deepEqual(matching(sheets, { bundleId: "com.mitchellh.ghostty", name: "Ghostty" }), []);
});
