import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { flatten, loadSheets, readSheetsIn, resolve } from "../src/lib/sheets.ts";

/**
 * Run against the real sheet files in the repo, not fixtures — the format is
 * defined by Keysi's Swift side and these tests exist to catch it drifting
 * away from what this extension expects.
 */
const REPO_SHEETS = join(import.meta.dirname, "..", "..", "Keysi", "Resources", "BuiltinSheets");

test("reads every bundled sheet", () => {
  const sheets = readSheetsIn(REPO_SHEETS);
  const ids = sheets.map((s) => s.id).sort();
  assert.deepEqual(ids, ["figma", "slack", "tmux", "vim"]);
});

test("a missing directory is empty, not an error", () => {
  assert.deepEqual(readSheetsIn("/nope/not/here"), []);
});

test("flattens bundled sheets into rows that all have a title", () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS));
  // Deliberately not an exact count — the sheets are content and will grow.
  // What must hold is that every sheet contributed and no row came out blank,
  // since a blank row is unselectable in the list and unfindable by search.
  assert.ok(rows.length > 20, `expected a substantial list, got ${rows.length}`);
  assert.ok(rows.every((r) => r.title.length > 0));
  assert.ok(rows.every((r) => r.sheetName.length > 0));
  assert.deepEqual(
    [...new Set(rows.map((r) => r.sheetId))].sort(),
    ["figma", "slack", "tmux", "vim"],
  );
});

test("the tmux sheet still carries real key notation", () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS)).filter((r) => r.sheetId === "tmux");
  assert.ok(rows.length > 0);
  assert.ok(rows.some((r) => r.keys.length > 0), "no tmux row had keys");
});

test("row ids are unique", () => {
  const rows = flatten(readSheetsIn(REPO_SHEETS));
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
});

test("user sheets shadow a built-in of the same id", () => {
  // Both dirs are the repo's, so every id collides with itself; the point is
  // that the count stays the same rather than doubling.
  const both = loadSheets([REPO_SHEETS], REPO_SHEETS);
  assert.equal(both.length, 4);
});

test("resolve prefers the requested language", () => {
  assert.equal(resolve({ en: "Panes", es: "Paneles" }, ["es"]), "Paneles");
});

test("resolve falls back through the base language", () => {
  assert.equal(resolve({ en: "Panes", "pt-BR": "Painéis" }, ["pt"]), "Painéis");
});

test("resolve falls back to English for an unknown language", () => {
  assert.equal(resolve({ en: "Panes", es: "Paneles" }, ["ja"]), "Panes");
});

test("resolve passes a bare string through", () => {
  assert.equal(resolve("Panes", ["es"]), "Panes");
});

/** An empty row in a search list is worse than one in the wrong language. */
test("resolve never returns empty when any variant exists", () => {
  assert.equal(resolve({ de: "Bereiche" }, ["ja"]), "Bereiche");
});

test("resolve on an empty map is empty rather than undefined", () => {
  assert.equal(resolve({}, ["en"]), "");
});
