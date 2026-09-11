// test/classify.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../src/lib/classify.js";

test("classify emits one record per input line", () => {
  const result = classify("a\nb\nc");
  assert.equal(result.length, 3);
  assert.equal(result[0].content, "a");
  assert.equal(result[1].content, "b");
  assert.equal(result[2].content, "c");
});

test("classify recognizes blank lines", () => {
  const r = classify("\n   \n\t\n");
  assert.equal(r.length, 4);
  assert.equal(r[0].role, "blank");
  assert.equal(r[1].role, "blank");
  assert.equal(r[2].role, "blank");
});

test("classify peels a single blockquote frame", () => {
  const r = classify("> hello");
  assert.equal(r.length, 1);
  assert.equal(r[0].prefixes.length, 1);
  assert.equal(r[0].prefixes[0].marker, ">");
  assert.equal(r[0].prefixes[0].spaceAfter, true);
  assert.equal(r[0].content, "hello");
  assert.equal(r[0].rawPrefix, "> ");
});

test("classify peels nested blockquote frames", () => {
  const r = classify("> > nested");
  assert.equal(r[0].prefixes.length, 2);
  assert.equal(r[0].content, "nested");
  assert.equal(r[0].rawPrefix, "> > ");
});

test("classify peels blockquote with no space after marker", () => {
  const r = classify(">foo");
  assert.equal(r[0].prefixes.length, 1);
  assert.equal(r[0].prefixes[0].spaceAfter, false);
  assert.equal(r[0].content, "foo");
});

test("classify treats blockquote-only line as blank inside the quote", () => {
  // CommonMark: `>` alone is a blockquote containing a blank line.
  const r = classify(">");
  assert.equal(r[0].prefixes.length, 1);
  assert.equal(r[0].role, "blank");
});

test("CRLF line endings are normalized", () => {
  const r = classify("a\r\nb\rc");
  assert.equal(r.length, 3);
  assert.deepEqual(
    r.map((x) => x.content),
    ["a", "b", "c"],
  );
});

test("classify recognizes fence boundary and in-fence lines", () => {
  const r = classify("```js\ncode here\nmore code\n```\nafter");
  assert.equal(r[0].role, "fence-boundary");
  assert.equal(r[0].fenceChar, "`");
  assert.equal(r[0].fenceLen, 3);
  assert.equal(r[1].role, "in-fence");
  assert.equal(r[2].role, "in-fence");
  assert.equal(r[3].role, "fence-boundary");
  assert.equal(r[4].role, "prose");
});

test("classify requires closer to match opener char", () => {
  // ~~~ does not close ```
  const r = classify("```\nstuff\n~~~\n```");
  assert.equal(r[0].role, "fence-boundary");
  assert.equal(r[1].role, "in-fence");
  assert.equal(r[2].role, "in-fence"); // not a closer for ```
  assert.equal(r[3].role, "fence-boundary");
  assert.equal(r[3].fenceChar, "`"); // confirms state machine resynced on the real closer
});

test("classify accepts longer closer than opener", () => {
  const r = classify("```\nstuff\n`````\nafter");
  assert.equal(r[2].role, "fence-boundary");
  assert.equal(r[3].role, "prose");
});

test("classify rejects shorter closer than opener", () => {
  const r = classify("`````\nstuff\n```\nstill in fence");
  assert.equal(r[2].role, "in-fence");
});

test("classify allows fences inside blockquotes", () => {
  const r = classify("> ```\n> code\n> ```");
  assert.equal(r[0].role, "fence-boundary");
  assert.equal(r[0].prefixes.length, 1);
  assert.equal(r[1].role, "in-fence");
  assert.equal(r[2].role, "fence-boundary");
});

test("classify recognizes ATX headings", () => {
  const r = classify("# H1\n## H2\n###### H6");
  assert.equal(r[0].role, "heading-atx");
  assert.equal(r[1].role, "heading-atx");
  assert.equal(r[2].role, "heading-atx");
});

test("classify recognizes horizontal rules", () => {
  const r = classify("---\n***\n___\n- - -");
  assert.equal(r[0].role, "hr");
  assert.equal(r[1].role, "hr");
  assert.equal(r[2].role, "hr");
  assert.equal(r[3].role, "hr");
});

test("classify recognizes link reference definitions", () => {
  const r = classify('[id]: https://example.com "title"');
  assert.equal(r[0].role, "link-ref-def");
});

test("classify recognizes list items and captures marker + hang indent", () => {
  const r = classify("- item\n  * nested\n10) ten");
  assert.equal(r[0].role, "list-item");
  assert.equal(r[0].listMarker, "-");
  assert.equal(r[0].hangIndent, 2);
  assert.equal(r[0].content, "item");

  assert.equal(r[1].role, "list-item");
  assert.equal(r[1].listMarker, "*");
  assert.equal(r[1].hangIndent, 4); // 2-space indent + "* " = 4

  assert.equal(r[2].role, "list-item");
  assert.equal(r[2].listMarker, "10)");
  assert.equal(r[2].hangIndent, 4); // "10) " = 4
});

test("classify detects task items via taskState", () => {
  const r = classify("- [ ] todo\n- [x] done\n- [X] done");
  assert.equal(r[0].role, "list-item");
  assert.equal(r[0].taskState, " ");
  assert.equal(r[0].content, "todo");
  assert.equal(r[1].taskState, "x");
  assert.equal(r[2].taskState, "X");
});

test("classify recognizes indented code outside a list", () => {
  const r = classify("para\n\n    code\n    more code");
  assert.equal(r[0].role, "prose");
  assert.equal(r[1].role, "blank");
  assert.equal(r[2].role, "indented-code");
  assert.equal(r[3].role, "indented-code");
});

test("classify treats indented text after a list item as list continuation, not code", () => {
  // 4-space indentation under a list-item marker is continuation, not a code block.
  const r = classify("- item\n    continuation");
  assert.equal(r[0].role, "list-item");
  assert.equal(r[1].role, "prose"); // not indented-code
});

test("classify recognizes HTML blocks", () => {
  const r = classify("<div>\nhello\n</div>");
  assert.equal(r[0].role, "html-block");
  // Subsequent lines inside an HTML block aren't tracked specially in v1 — they're prose.
});

test("classify recognizes HTML comments as html-block", () => {
  const r = classify("<!-- comment -->");
  assert.equal(r[0].role, "html-block");
});

test("classify recognizes setext h1 (===) and tags both lines", () => {
  const r = classify("Title\n=====\n\npara");
  assert.equal(r[0].role, "heading-setext");
  assert.equal(r[1].role, "heading-setext");
  assert.equal(r[2].role, "blank");
  assert.equal(r[3].role, "prose");
});

test("classify recognizes setext h2 (---)", () => {
  const r = classify("Title\n-----");
  assert.equal(r[0].role, "heading-setext");
  assert.equal(r[1].role, "heading-setext");
});

test("classify retags 3-dash HR as setext h2 when preceded by prose", () => {
  // Boundary case: --- alone is HR, but adjacent to prose at the same depth
  // setext takes priority. Confirms applySetextPass overrides the HR tag.
  const r = classify("para\n---");
  assert.equal(r[0].role, "heading-setext");
  assert.equal(r[1].role, "heading-setext");
});

test("--- after a blank line is HR, not setext", () => {
  const r = classify("para\n\n---");
  assert.equal(r[2].role, "hr");
});

test("--- under a list-item is HR, not setext", () => {
  const r = classify("- item\n---");
  // prior line is list-item, so --- can't be setext
  assert.equal(r[1].role, "hr");
});

test("classify recognizes a complete pipe table", () => {
  const r = classify("| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n\nafter");
  assert.equal(r[0].role, "table-row");
  assert.equal(r[1].role, "table-row");
  assert.equal(r[2].role, "table-row");
  assert.equal(r[3].role, "table-row");
  assert.equal(r[4].role, "blank");
  assert.equal(r[5].role, "prose");
});

test("classify table without leading/trailing pipes", () => {
  const r = classify("a | b\n--- | ---\n1 | 2");
  assert.equal(r[0].role, "table-row");
  assert.equal(r[1].role, "table-row");
  assert.equal(r[2].role, "table-row");
});

test("classify lone pipe in prose is not a table", () => {
  const r = classify("foo | bar");
  assert.equal(r[0].role, "prose");
});

test("classify detects hard break via trailing 2+ spaces", () => {
  const r = classify("foo  \nbar");
  assert.equal(r[0].role, "prose");
  assert.equal(r[0].hardBreak, "spaces");
  assert.equal(r[1].hardBreak, undefined);
});

test("classify detects hard break via trailing backslash", () => {
  const r = classify("foo\\\nbar");
  assert.equal(r[0].hardBreak, "backslash");
});

test("hard break only applies to reflow-eligible roles", () => {
  const r = classify("# heading  \n\n    code  ");
  assert.equal(r[0].role, "heading-atx");
  assert.equal(r[0].hardBreak, undefined);
  // line 1 is blank
  assert.equal(r[2].role, "indented-code");
  assert.equal(r[2].hardBreak, undefined);
});

test("hard break applies to list items", () => {
  const r = classify("- item one  \n- item two");
  assert.equal(r[0].role, "list-item");
  assert.equal(r[0].hardBreak, "spaces");
});
