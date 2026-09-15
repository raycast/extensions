import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_EXCLUDED_DIRECTORIES, parseList, validatePreferences } from "./preference-validation.ts";

test("empty raw preferences produce safe defaults", () => {
  const prefs = validatePreferences({});
  assert.equal(prefs.defaultDirectory, null);
  assert.equal(prefs.noFinderBehavior, "home");
  assert.equal(prefs.preferredEngine, "automatic");
  assert.equal(prefs.defaultCaseMode, "smart");
  assert.equal(prefs.defaultSearchMode, "text");
  assert.equal(prefs.defaultMaxDepth, null);
  assert.equal(prefs.maxResults, 250);
  assert.equal(prefs.maxFileSizeBytes, 10 * 1024 * 1024);
  assert.equal(prefs.searchHiddenFiles, false);
  assert.equal(prefs.respectIgnoreFiles, true);
  assert.equal(prefs.showMatchPreview, true);
  assert.equal(validatePreferences({ showMatchPreview: false }).showMatchPreview, false);
  assert.deepEqual(prefs.excludedDirectories, DEFAULT_EXCLUDED_DIRECTORIES);
  assert.deepEqual(prefs.includedExtensions, []);
  assert.equal(prefs.debounceMs, 200);
  assert.equal(prefs.preferredEditor, "vscode");
});

test("garbage enum values fall back instead of crashing", () => {
  const prefs = validatePreferences({
    noFinderBehavior: "explode",
    preferredEngine: "grep",
    defaultCaseMode: "loud",
    defaultSearchMode: "telepathy",
    preferredEditor: "vim",
  });
  assert.equal(prefs.noFinderBehavior, "home");
  assert.equal(prefs.preferredEngine, "automatic");
  assert.equal(prefs.defaultCaseMode, "smart");
  assert.equal(prefs.defaultSearchMode, "text");
  assert.equal(prefs.preferredEditor, "vscode");
});

test("numeric preferences are clamped to their bounds", () => {
  const prefs = validatePreferences({
    defaultMaxDepth: "99999",
    maxResults: "0",
    maxFileSizeMb: "-5",
    debounceMs: "abc",
  });
  assert.equal(prefs.defaultMaxDepth, 100);
  assert.equal(prefs.maxResults, 1);
  assert.equal(prefs.maxFileSizeBytes, 1024 * 1024);
  assert.equal(prefs.debounceMs, 200);
});

test("depth zero or negative means unlimited", () => {
  assert.equal(validatePreferences({ defaultMaxDepth: "0" }).defaultMaxDepth, null);
  assert.equal(validatePreferences({ defaultMaxDepth: "-3" }).defaultMaxDepth, null);
  assert.equal(validatePreferences({ defaultMaxDepth: "5" }).defaultMaxDepth, 5);
});

test("lists are parsed with trimming and extension dots stripped", () => {
  assert.deepEqual(parseList(" a , ,b,, c "), ["a", "b", "c"]);
  const prefs = validatePreferences({ excludedDirectories: "target, .venv", includedExtensions: ".ts, tsx" });
  assert.deepEqual(prefs.excludedDirectories, ["target", ".venv"]);
  assert.deepEqual(prefs.includedExtensions, ["ts", "tsx"]);
});
