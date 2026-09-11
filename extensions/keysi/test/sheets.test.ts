import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { flatten, loadSheets, readSheetsIn, resolve } from "../src/lib/sheets.ts";

/**
 * Run against the real sheet files in the repo, not fixtures — the format is
 * defined by Keysi's Swift side and these tests exist to catch it drifting
 * away from what this extension expects.
 *
 * That only works inside Keysi's own repository. When this extension is
 * vendored into `raycast/extensions` the directory does not come with it, so
 * these skip rather than fail — a red test in someone else's monorepo over a
 * path that cannot exist there is noise, and it was flagged in review. The
 * checks still run where they are meaningful, which is here.
 */
const REPO_SHEETS = join(import.meta.dirname, "..", "..", "Keysi", "Resources", "BuiltinSheets");
const inKeysiRepo = existsSync(REPO_SHEETS);
const skip = inKeysiRepo ? false : "not in the Keysi repo — bundled sheets are not vendored with the extension";

test("reads every bundled sheet", { skip }, () => {
  const sheets = readSheetsIn(REPO_SHEETS);
  const ids = sheets.map((s) => s.id).sort();
  assert.deepEqual(ids, ["figma", "slack", "tmux", "vim"]);
});

test("a missing directory is empty, not an error", () => {
  assert.deepEqual(readSheetsIn("/nope/not/here"), []);
});

test("flattens bundled sheets into rows that all have a title", { skip }, () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS));
  // Deliberately not an exact count — the sheets are content and will grow.
  // What must hold is that every sheet contributed and no row came out blank,
  // since a blank row is unselectable in the list and unfindable by search.
  assert.ok(rows.length > 20, `expected a substantial list, got ${rows.length}`);
  assert.ok(rows.every((r) => r.title.length > 0));
  assert.ok(rows.every((r) => r.sheetName.length > 0));
  assert.deepEqual([...new Set(rows.map((r) => r.sheetId))].sort(), ["figma", "slack", "tmux", "vim"]);
});

test("the tmux sheet still carries real key notation", { skip }, () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS)).filter((r) => r.sheetId === "tmux");
  assert.ok(rows.length > 0);
  assert.ok(
    rows.some((r) => r.keys.length > 0),
    "no tmux row had keys",
  );
});

test("row ids are unique", { skip }, () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS));
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
});

test("user sheets shadow a built-in of the same id", { skip }, () => {
  // Both dirs are the repo's, so every id collides with itself; the point is
  // that the count stays the same rather than doubling.
  const both = loadSheets([REPO_SHEETS], REPO_SHEETS);
  assert.equal(both.length, 4);
});

test("resolve returns English when present", () => {
  assert.equal(resolve({ en: "Panes", es: "Paneles" }), "Panes");
});

/**
 * The rule this encodes is the store guideline, not a preference: the
 * extension is US English only, so a Spanish system must still see the
 * English row rather than a half-translated list. `resolve` used to read the
 * system locale and was flagged for it in review.
 */
test("resolve ignores the system language", () => {
  const previous = process.env.LANG;
  process.env.LANG = "es_ES.UTF-8";
  try {
    assert.equal(resolve({ en: "Panes", es: "Paneles" }), "Panes");
  } finally {
    if (previous === undefined) delete process.env.LANG;
    else process.env.LANG = previous;
  }
});

test("resolve accepts an English regional variant", () => {
  assert.equal(resolve({ "en-GB": "Panes", es: "Paneles" }), "Panes");
});

test("resolve passes a bare string through", () => {
  assert.equal(resolve("Panes"), "Panes");
});

/** An empty row in a search list is worse than one in the wrong language. */
test("resolve never returns empty when any variant exists", () => {
  assert.equal(resolve({ de: "Bereiche" }), "Bereiche");
});

/** Deterministic rather than dependent on JSON key order. */
test("resolve picks the first tag in sorted order when there is no English", () => {
  assert.equal(resolve({ ja: "ペイン", de: "Bereiche" }), "Bereiche");
});

test("resolve on an empty map is empty rather than undefined", () => {
  assert.equal(resolve({}), "");
});

/**
 * Every row remembers the file it came from, which is what lets a row offer
 * to open the sheet that produced it — the fastest route from "this is
 * wrong" to fixing it.
 */
test("rows carry the file they came from", { skip }, () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS));
  assert.ok(rows.every((r) => r.sourcePath?.endsWith(".json")), "a row lost its source file");
  const vim = rows.find((r) => r.sheetId === "vim");
  assert.ok(vim?.sourcePath?.endsWith("vim.json"), vim?.sourcePath);
});
