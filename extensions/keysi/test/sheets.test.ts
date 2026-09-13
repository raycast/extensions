import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { flatten, loadSheets, readSheetsIn, resolve } from "../src/lib/sheets.ts";

/**
 * Two sources, deliberately.
 *
 * `FIXTURES` is committed alongside these tests, so the core assertions —
 * parsing, flattening, id uniqueness, user-sheet precedence — run everywhere,
 * including inside `raycast/extensions` where this extension is vendored
 * without Keysi's app resources. An earlier version of this file skipped
 * those tests there, which review correctly rejected: it traded a false
 * failure for no coverage at all.
 *
 * `REPO_SHEETS` is Keysi's real shipped sheets. The format is defined by the
 * Swift side, so the tests that read it exist to catch that drifting away
 * from what this extension expects — genuinely impossible outside Keysi's own
 * repository, and the only ones still guarded.
 */
const FIXTURES = join(import.meta.dirname, "fixtures", "builtin");
const USER_FIXTURES = join(import.meta.dirname, "fixtures", "user");
const REPO_SHEETS = join(import.meta.dirname, "..", "..", "Keysi", "Resources", "BuiltinSheets");
const skip = existsSync(REPO_SHEETS)
  ? false
  : "only meaningful in the Keysi repo — the app's shipped sheets are not vendored with the extension";

test("reads the fixture sheets", () => {
  assert.deepEqual(
    readSheetsIn(FIXTURES).map((s) => s.id).sort(),
    ["tmux", "vim"],
  );
});

/** readSheetsIn promises one bad file will not take the list down. */
test("a malformed sheet is skipped rather than fatal", () => {
  // fixtures/builtin holds broken.json alongside the two valid sheets.
  assert.equal(readSheetsIn(FIXTURES).length, 2);
});

test("flattens fixtures into rows that all have a title", () => {
  const rows = flatten(readSheetsIn(FIXTURES));
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.title.length > 0));
  assert.ok(rows.every((r) => r.sheetName.length > 0));
});

/** A bare string name is the other branch of LocalizedText. */
test("a sheet named with a bare string resolves", () => {
  const tmux = flatten(readSheetsIn(FIXTURES)).filter((r) => r.sheetId === "tmux");
  assert.equal(tmux[0].sheetName, "tmux");
});

test("fixture row ids are unique", () => {
  const rows = flatten(readSheetsIn(FIXTURES));
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
});

test("a user sheet shadows a built-in of the same id", () => {
  const sheets = loadSheets([FIXTURES], USER_FIXTURES);
  assert.equal(sheets.length, 2, "vim appears once, not twice");
  const vim = sheets.find((s) => s.id === "vim");
  assert.equal(resolve(vim.name), "Vim (mine)");
});

test("keys survive flattening for a raw sheet", () => {
  const rows = flatten(readSheetsIn(FIXTURES));
  assert.ok(rows.some((r) => r.keys === "Ctrl-b %"));
});

test("Keysi's shipped sheets still match the format this reader expects", { skip }, () => {
  const sheets = readSheetsIn(REPO_SHEETS);
  const ids = sheets.map((s) => s.id).sort();
  assert.deepEqual(ids, ["figma", "slack", "tmux", "vim"]);
});

test("a missing directory is empty, not an error", () => {
  assert.deepEqual(readSheetsIn("/nope/not/here"), []);
});

test("Keysi's shipped sheets flatten into titled rows", { skip }, () => {
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
