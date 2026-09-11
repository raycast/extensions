import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchResult } from "../types/search.ts";
import { locateMatch, resultDetailMarkdown } from "./result-detail.ts";

const NBSP = "\u00A0";

function result(overrides: Partial<SearchResult>): SearchResult {
  return {
    filePath: "/tmp/project/notes.txt",
    relativePath: "notes.txt",
    fileName: "notes.txt",
    line: 3,
    column: 1,
    lineText: "hello world",
    ...overrides,
  };
}

test("text mode locates the match at the reported column", () => {
  assert.deepEqual(
    locateMatch("const value = 42;", 7, "value", { searchMode: "text", caseMode: "sensitive" }),
    [6, 11],
  );
});

test("text mode falls back to indexOf when the column is off", () => {
  assert.deepEqual(
    locateMatch("const value = 42;", 1, "value", { searchMode: "text", caseMode: "sensitive" }),
    [6, 11],
  );
});

test("smart case is insensitive for lowercase queries and sensitive for mixed case", () => {
  assert.deepEqual(locateMatch("Hello World", 1, "hello", { searchMode: "text", caseMode: "smart" }), [0, 5]);
  assert.equal(locateMatch("hello world", 1, "Hello", { searchMode: "text", caseMode: "smart" }), null);
});

test("regex mode locates the match nearest the reported column", () => {
  assert.deepEqual(locateMatch("ab 12 cd 34", 9, "\\d+", { searchMode: "regex", caseMode: "sensitive" }), [9, 11]);
});

test("regex mode falls back to the first match when none reaches the column", () => {
  assert.deepEqual(locateMatch("ab 12 cd", 100, "\\d+", { searchMode: "regex", caseMode: "sensitive" }), [3, 5]);
});

test("invalid or zero-length regex yields no highlight instead of throwing", () => {
  assert.equal(locateMatch("abc", 1, "(", { searchMode: "regex", caseMode: "sensitive" }), null);
  assert.equal(locateMatch("abc", 1, "x*", { searchMode: "regex", caseMode: "sensitive" }), null);
});

test("no match yields null", () => {
  assert.equal(locateMatch("abc", 1, "zzz", { searchMode: "text", caseMode: "insensitive" }), null);
});

test("markdown bolds the match and escapes markdown specials", () => {
  const markdown = resultDetailMarkdown(result({ lineText: "const value = a * b;", column: 7 }), "value", {
    searchMode: "text",
    caseMode: "sensitive",
  });
  assert.equal(markdown, "const **value** = a \\* b;");
});

test("markdown includes context lines with hard line breaks and preserved indent", () => {
  const markdown = resultDetailMarkdown(
    result({ lineText: "  match here", column: 3, contextBefore: ["before", ""], contextAfter: ["after"] }),
    "match",
    { searchMode: "text", caseMode: "sensitive" },
  );
  assert.equal(markdown, ["before", NBSP, `${NBSP}${NBSP}**match** here`, "after"].join("  \n"));
});

test("markdown degrades to the escaped line when the match cannot be located", () => {
  const markdown = resultDetailMarkdown(result({ lineText: "plain [line]" }), "missing", {
    searchMode: "text",
    caseMode: "sensitive",
  });
  assert.equal(markdown, "plain [line\\]");
});

test("parentheses stay literal — Raycast renders \\(..\\) as LaTeX math", () => {
  const markdown = resultDetailMarkdown(result({ lineText: "clearTimeout(filterTimeout);", column: 6 }), "Timeout", {
    searchMode: "text",
    caseMode: "smart",
  });
  assert.equal(markdown, "clear**Timeout**(filterTimeout);");
});

test("code files render as a fenced block with a language tag and no escaping", () => {
  const markdown = resultDetailMarkdown(
    result({
      fileName: "app.ts",
      lineText: "const value = a * b;",
      contextBefore: ["// before"],
      contextAfter: ["// after"],
    }),
    "value",
    { searchMode: "text", caseMode: "sensitive" },
  );
  assert.equal(markdown, "```typescript\n// before\nconst value = a * b;\n// after\n```");
});

test("unknown extensions still get a plain fence, and the fence outgrows backtick runs", () => {
  const markdown = resultDetailMarkdown(result({ fileName: "data.xyz", lineText: "docs use ``` fences" }), "docs", {
    searchMode: "text",
    caseMode: "sensitive",
  });
  assert.equal(markdown, "````\ndocs use ``` fences\n````");
});

test("no LaTeX delimiter can survive escaping", () => {
  const markdown = resultDetailMarkdown(result({ lineText: 'echo "$$PID" and regex \\(x\\) done' }), "missing", {
    searchMode: "text",
    caseMode: "sensitive",
  });
  // None of Raycast's math delimiters may appear in the output.
  assert.ok(!markdown.includes("$$"));
  assert.ok(!markdown.includes("\\("));
  assert.ok(!markdown.includes("\\)"));
  assert.ok(!markdown.includes("\\["));
});
