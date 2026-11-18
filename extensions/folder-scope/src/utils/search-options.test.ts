import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchOptions } from "../types/search.ts";
import { DEFAULT_EXCLUDED_DIRECTORIES, validatePreferences } from "./preference-validation.ts";
import { normalizeSearchOptions, searchOptionsFromPreferences } from "./search-options.ts";

const BASE: SearchOptions = {
  caseMode: "smart",
  searchMode: "regex",
  wholeWord: false,
  multiline: false,
  invertMatch: false,
  maxDepth: null,
  includeHidden: false,
  followSymlinks: false,
  respectIgnoreFiles: true,
  includeBinary: false,
  searchFileNames: false,
  includedExtensions: [],
  excludedExtensions: [],
  excludedDirectories: [],
  includeGlobs: [],
  excludeGlobs: [],
  maxResults: 250,
  maxFileSizeBytes: 10 * 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

test("text mode forces multiline off (fixed strings are literal)", () => {
  const normalized = normalizeSearchOptions({ ...BASE, searchMode: "text", multiline: true });
  assert.equal(normalized.multiline, false);
  const regex = normalizeSearchOptions({ ...BASE, searchMode: "regex", multiline: true });
  assert.equal(regex.multiline, true);
});

test("numeric options are clamped", () => {
  const normalized = normalizeSearchOptions({
    ...BASE,
    maxDepth: 5000,
    maxResults: -1,
    maxFileSizeBytes: 0,
    contextBefore: 99,
    contextAfter: -2,
  });
  assert.equal(normalized.maxDepth, 100);
  assert.equal(normalized.maxResults, 1);
  assert.equal(normalized.maxFileSizeBytes, 1024);
  assert.equal(normalized.contextBefore, 10);
  assert.equal(normalized.contextAfter, 0);
});

test("invalid globs, extensions, and directory names are dropped", () => {
  const normalized = normalizeSearchOptions({
    ...BASE,
    includedExtensions: [".ts", "a b"],
    excludedExtensions: ["log", "*"],
    excludedDirectories: ["node_modules", "a/b"],
    includeGlobs: ["src/**", ""],
    excludeGlobs: ["  ", "!vendor/**"],
  });
  assert.deepEqual(normalized.includedExtensions, ["ts"]);
  assert.deepEqual(normalized.excludedExtensions, ["log"]);
  assert.deepEqual(normalized.excludedDirectories, ["node_modules"]);
  assert.deepEqual(normalized.includeGlobs, ["src/**"]);
  assert.deepEqual(normalized.excludeGlobs, ["!vendor/**"]);
});

test("options derived from default preferences are already normalized", () => {
  const options = searchOptionsFromPreferences(validatePreferences({}));
  assert.equal(options.searchMode, "text");
  assert.equal(options.caseMode, "smart");
  assert.equal(options.maxResults, 250);
  assert.deepEqual(options.excludedDirectories, DEFAULT_EXCLUDED_DIRECTORIES);
  assert.equal(options.multiline, false);
  assert.equal(options.includeBinary, false);
  assert.equal(options.searchFileNames, false);
  assert.equal(options.contextBefore, 0);
  assert.equal(options.contextAfter, 0);
});

test("preview context lines preference is bounded and feeds both context options", () => {
  const options = searchOptionsFromPreferences(validatePreferences({ previewContextLines: "99" }));
  assert.equal(options.contextBefore, 10);
  const off = searchOptionsFromPreferences(validatePreferences({ previewContextLines: "0" }));
  assert.equal(off.contextBefore, 0);
  assert.equal(off.contextAfter, 0);
});
