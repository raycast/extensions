import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchError, SearchOptions } from "../types/search.ts";
import {
  compileGlob,
  compileQueryMatcher,
  globMatches,
  isIgnoredByRules,
  looksBinary,
  parseIgnoreContent,
  scanLines,
  scanMultiline,
  splitLines,
} from "./fallback-search.ts";

const BASE_OPTIONS: SearchOptions = {
  caseMode: "smart",
  searchMode: "text",
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
  maxFileSizeBytes: 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

function options(overrides: Partial<SearchOptions> = {}): SearchOptions {
  return { ...BASE_OPTIONS, ...overrides };
}

const NO_CONTEXT = { contextBefore: 0, contextAfter: 0, maxMatches: 250 };

test("detects binary content via NUL byte and accepts UTF-8 text", () => {
  assert.equal(looksBinary(Buffer.from([0x50, 0x4b, 0x00, 0x01])), true);
  assert.equal(looksBinary(Buffer.from("Türkçe metin, ölçüm ve ığüşöç")), false);
});

test("splits lines without phantom trailing line and strips CR", () => {
  assert.deepEqual(splitLines("a\nb\n"), ["a", "b"]);
  assert.deepEqual(splitLines("a\r\nb"), ["a", "b"]);
  assert.deepEqual(splitLines(""), []);
});

test("throws invalid-query for a broken regex", () => {
  assert.throws(
    () => compileQueryMatcher("(", options({ searchMode: "regex" })),
    (error: unknown) => (error as SearchError).kind === "invalid-query",
  );
});

test("smart case is insensitive for lowercase and sensitive with uppercase", () => {
  const insensitive = compileQueryMatcher("ara", options());
  assert.equal(scanLines(["ARA sokak"], 0, 1, insensitive, NO_CONTEXT).length, 1);
  const sensitive = compileQueryMatcher("Ara", options());
  assert.equal(scanLines(["ara sokak"], 0, 1, sensitive, NO_CONTEXT).length, 0);
});

test("plain text mode escapes regex metacharacters", () => {
  const matcher = compileQueryMatcher("a.b", options());
  assert.equal(scanLines(["axb"], 0, 1, matcher, NO_CONTEXT).length, 0);
  assert.equal(scanLines(["a.b"], 0, 1, matcher, NO_CONTEXT).length, 1);
});

test("emits one match per occurrence with 1-based columns", () => {
  const matcher = compileQueryMatcher("ara", options({ caseMode: "sensitive" }));
  const matches = scanLines(["ara ara"], 0, 1, matcher, NO_CONTEXT);
  assert.deepEqual(
    matches.map((match) => match.column),
    [1, 5],
  );
});

test("whole word does not match inside a longer word", () => {
  const matcher = compileQueryMatcher("kat", options({ wholeWord: true }));
  assert.equal(scanLines(["katman"], 0, 1, matcher, NO_CONTEXT).length, 0);
  assert.equal(scanLines(["kat sayısı"], 0, 1, matcher, NO_CONTEXT).length, 1);
});

test("invert emits non-matching lines at column 1", () => {
  const matcher = compileQueryMatcher("ara", options({ invertMatch: true }));
  const matches = scanLines(["ara var", "temiz satır"], 0, 2, matcher, NO_CONTEXT);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].line, 2);
  assert.equal(matches[0].column, 1);
});

test("attaches before and after context from surrounding lines", () => {
  const matcher = compileQueryMatcher("ara", options());
  const matches = scanLines(["önce", "ara bul", "sonra"], 0, 3, matcher, {
    contextBefore: 1,
    contextAfter: 1,
    maxMatches: 250,
  });
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].contextBefore, ["önce"]);
  assert.deepEqual(matches[0].contextAfter, ["sonra"]);
});

test("zero-length regex matches terminate and respect maxMatches", () => {
  const matcher = compileQueryMatcher("x*", options({ searchMode: "regex" }));
  const matches = scanLines(["ab"], 0, 1, matcher, { ...NO_CONTEXT, maxMatches: 2 });
  assert.equal(matches.length, 2);
});

test("multiline regex matches across lines with correct position", () => {
  const matcher = compileQueryMatcher("birinci\\nikinci", options({ searchMode: "regex", multiline: true }));
  assert.equal(matcher.multiline, true);
  const content = "sıfırıncı\nbirinci\nikinci\nüçüncü\n";
  const matches = scanMultiline(content, splitLines(content), matcher, {
    contextBefore: 1,
    contextAfter: 1,
    maxMatches: 250,
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].line, 2);
  assert.equal(matches[0].column, 1);
  assert.equal(matches[0].lineText, "birinci");
  assert.deepEqual(matches[0].contextBefore, ["sıfırıncı"]);
  assert.deepEqual(matches[0].contextAfter, ["üçüncü"]);
});

test("globs match basename without a slash and full path with one", () => {
  const byExtension = compileGlob("*.ts");
  assert.ok(byExtension);
  assert.equal(globMatches(byExtension, "src/deep/a.ts"), true);
  assert.equal(globMatches(byExtension, "src/a.tsx"), false);

  const byPath = compileGlob("src/*.ts");
  assert.ok(byPath);
  assert.equal(globMatches(byPath, "src/a.ts"), true);
  assert.equal(globMatches(byPath, "src/deep/a.ts"), false);

  const byTree = compileGlob("**/dist/**");
  assert.ok(byTree);
  assert.equal(globMatches(byTree, "packages/app/dist/x.js"), true);
  assert.equal(globMatches(byTree, "dist/x.js"), true);
  assert.equal(globMatches(byTree, "src/x.js"), false);
});

test("parses ignore content, skipping comments, blanks, and negations", () => {
  const rules = parseIgnoreContent("# yorum\n\nnode_modules/\n!keep.log\n*.log\n");
  assert.equal(rules.length, 2);
  assert.equal(isIgnoredByRules(rules, "debug.log", false), true);
  assert.equal(isIgnoredByRules(rules, "alt/debug.log", false), true);
  assert.equal(isIgnoredByRules(rules, "node_modules", true), true);
  assert.equal(isIgnoredByRules(rules, "node_modules", false), false);
  assert.equal(isIgnoredByRules(rules, "app.txt", false), false);
});
