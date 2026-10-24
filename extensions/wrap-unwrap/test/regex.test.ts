// test/regex.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKQUOTE_PEEL,
  FENCE_BOUNDARY,
  indentColumns,
  isIndentedCode,
  HEADING_ATX,
  SETEXT_UNDERLINE,
  HR,
  LIST_ITEM,
  TASK_MARKER,
  LINK_REF_DEF,
  TABLE_SEPARATOR,
  HARD_BREAK_SPACES,
  HARD_BREAK_BACKSLASH,
  HYPHEN_BREAK_END,
} from "../src/lib/regex.js";

test("BLOCKQUOTE_PEEL matches a single quote frame", () => {
  assert.match("> hello", BLOCKQUOTE_PEEL);
  assert.match(">hello", BLOCKQUOTE_PEEL);
  assert.doesNotMatch("hello", BLOCKQUOTE_PEEL);
});

test("FENCE_BOUNDARY matches both backtick and tilde fences", () => {
  assert.match("```", FENCE_BOUNDARY);
  assert.match("~~~~", FENCE_BOUNDARY);
  assert.match("   ```js", FENCE_BOUNDARY);
  assert.doesNotMatch("``", FENCE_BOUNDARY);
  assert.doesNotMatch("    ```", FENCE_BOUNDARY); // 4 spaces = code block, not fence
});

test("isIndentedCode recognizes an indent reaching column 4, tabs included", () => {
  assert.ok(isIndentedCode("    code"));
  assert.ok(isIndentedCode("        deeper"));
  // A tab advances to the next 4-column stop (CommonMark §2.2).
  assert.ok(isIndentedCode("\tcode"), "one tab = column 4");
  assert.ok(isIndentedCode("\t\tcode"), "two tabs = column 8");
  assert.ok(isIndentedCode("  \tcode"), "2 spaces + tab = column 4");
  assert.ok(isIndentedCode("   \tcode"), "3 spaces + tab = column 4");
  assert.ok(isIndentedCode(" \t\tcode"), "space + 2 tabs = column 8");
  assert.ok(!isIndentedCode("   not code"), "only 3 spaces");
  assert.ok(!isIndentedCode("    "), "no body"); // whitespace only
});

test("HEADING_ATX matches ATX headings 1-6", () => {
  assert.match("# H1", HEADING_ATX);
  assert.match("###### H6", HEADING_ATX);
  assert.match("#", HEADING_ATX);
  assert.doesNotMatch("####### too many", HEADING_ATX);
  assert.doesNotMatch("#nospace", HEADING_ATX);
  // Closed ATX (trailing # marks) — should still match.
  assert.match("# Heading #", HEADING_ATX);
});

test("SETEXT_UNDERLINE matches = and - rules", () => {
  assert.match("===", SETEXT_UNDERLINE);
  assert.match("---", SETEXT_UNDERLINE);
  assert.match("=", SETEXT_UNDERLINE);
  assert.doesNotMatch("=-=", SETEXT_UNDERLINE);
  assert.doesNotMatch("", SETEXT_UNDERLINE);
});

test("HR matches 3+ same chars; rejects mixed", () => {
  assert.match("---", HR);
  assert.match("***", HR);
  assert.match("___", HR);
  assert.match("- - -", HR);
  assert.doesNotMatch("--", HR);
  assert.doesNotMatch("-*-", HR);
});

test("LIST_ITEM captures indent, marker, and gap", () => {
  const m = "  - item".match(LIST_ITEM);
  assert.ok(m);
  assert.equal(m[1], "  ");
  assert.equal(m[2], "-");
  assert.equal(m[3], " ");

  const ord = "1. item".match(LIST_ITEM);
  assert.ok(ord);
  assert.equal(ord[2], "1.");

  const paren = "10) item".match(LIST_ITEM);
  assert.ok(paren);
  assert.equal(paren[2], "10)");

  // 9-digit cap
  assert.doesNotMatch("1234567890. item", LIST_ITEM);
  assert.doesNotMatch("*nospace", LIST_ITEM);
});

test("TASK_MARKER matches checkbox prefix", () => {
  assert.match("[ ] todo", TASK_MARKER);
  assert.match("[x] done", TASK_MARKER);
  assert.match("[X] done", TASK_MARKER);
  assert.doesNotMatch("[y] bad", TASK_MARKER);
});

test("LINK_REF_DEF matches reference link definitions", () => {
  assert.match("[id]: https://example.com", LINK_REF_DEF);
  assert.match('[id]: https://example.com "title"', LINK_REF_DEF);
  assert.doesNotMatch("[id]:", LINK_REF_DEF);
  // Whitespace required between `]:` and the URL.
  assert.doesNotMatch("[id]:url", LINK_REF_DEF);
});

test("TABLE_SEPARATOR matches separator rows", () => {
  assert.match("| --- | --- |", TABLE_SEPARATOR);
  assert.match("|:--|:-:|--:|", TABLE_SEPARATOR);
  assert.match("--- | ---", TABLE_SEPARATOR);
  assert.doesNotMatch("| header | header |", TABLE_SEPARATOR);
  // Bare `---` is HR, not a table separator — load-bearing distinction.
  assert.doesNotMatch("---", TABLE_SEPARATOR);
});

test("HARD_BREAK_SPACES matches 2+ trailing spaces", () => {
  assert.match("foo  ", HARD_BREAK_SPACES);
  assert.match("foo    ", HARD_BREAK_SPACES);
  assert.doesNotMatch("foo ", HARD_BREAK_SPACES);
  assert.doesNotMatch("foo", HARD_BREAK_SPACES);
});

test("HARD_BREAK_BACKSLASH matches single trailing backslash", () => {
  assert.match("foo\\", HARD_BREAK_BACKSLASH);
  assert.doesNotMatch("foo", HARD_BREAK_BACKSLASH);
});

test("HYPHEN_BREAK_END matches a letter or digit followed by a break hyphen", () => {
  assert.match("inter-", HYPHEN_BREAK_END);
  // Case, hyphen chains, and digits all bind to the next line now: the join is
  // always tight, and only a U+00AD is ever stripped, so none of these need
  // excluding. Previously they were, which is why "well-known" was mashed.
  assert.match("State-", HYPHEN_BREAK_END);
  assert.match("state-of-the-", HYPHEN_BREAK_END);
  assert.match("123-", HYPHEN_BREAK_END);
  // Unicode letters qualify (an ASCII-only class failed to rejoin these).
  assert.match("Wörter-", HYPHEN_BREAK_END);
  assert.match("Бинде-", HYPHEN_BREAK_END);
  // A true soft hyphen also counts as a break hyphen.
  assert.match("hy­", HYPHEN_BREAK_END);
  // No trailing hyphen, or no letter/digit before it.
  assert.doesNotMatch("inter", HYPHEN_BREAK_END);
  assert.doesNotMatch(" -", HYPHEN_BREAK_END);
});

test("indentColumns expands tabs to 4-column stops", () => {
  assert.equal(indentColumns("\t"), 4);
  assert.equal(indentColumns(" \t"), 4, "a tab advances to the NEXT stop, not by 4");
  assert.equal(indentColumns("   \t"), 4);
  assert.equal(indentColumns("\t "), 5);
  assert.equal(indentColumns("\t\t"), 8);
  assert.equal(indentColumns("    "), 4);
  assert.equal(indentColumns("   "), 3);
});
