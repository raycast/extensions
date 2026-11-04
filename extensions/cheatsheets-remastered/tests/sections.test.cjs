const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sheetSections } = require("../.test-dist/sections");

for (const [name, eol] of [
  ["LF", "\n"],
  ["CRLF", "\r\n"],
]) {
  for (const underline of ["===", "---"]) {
    test(`multiline Setext ${underline} (${name}) retains the full title, source line and copied source`, () => {
      const preamble = ["---", "title: Guide", "---", "# Parent", "Intro", "", ""].join(eol);
      const heading = ["First line", "  Second line 😀  ", "Third line", underline, "Body <T>", "", ""].join(eol);
      const next = ["## Next", "End", ""].join(eol);
      const sections = sheetSections(preamble + heading + next);
      assert.deepEqual(
        sections.map((s) => s.title),
        ["Parent", "First line Second line 😀 Third line", "Next"],
      );
      assert.equal(sections[1].line, 7);
      assert.equal(sections[1].context, underline === "===" ? "" : "Parent");
      assert.equal(sections[1].source, heading);
      assert.equal(sections[1].id, String(preamble.length));
      assert.equal(sections.map((s) => s.source).join(""), ["# Parent", "Intro", "", ""].join(eol) + heading + next);
    });
  }

  test(`indented continuation stays in an open Setext paragraph (${name})`, () => {
    const source = ["First line", "    Second line", "\tThird line", "===", "Body", ""].join(eol);
    const [section] = sheetSections(source);
    assert.equal(section.title, "First line Second line Third line");
    assert.equal(section.line, 1);
    assert.equal(section.source, source);
  });

  test(`reference-like text cannot interrupt an open Setext paragraph (${name})`, () => {
    const source = ["First line", "[ref]: https://example.com", "===", "Body", ""].join(eol);
    const [section] = sheetSections(source);
    assert.equal(section.title, "First line [ref]: https://example.com");
    assert.equal(section.line, 1);
    assert.equal(section.source, source);
  });

  for (const boundary of [
    "",
    "# Parent",
    "***",
    "* * *",
    "___",
    "- - -",
    "---",
    "> Quote",
    "- Item",
    "1. Item",
    "    indented code",
    "\tindented code",
    "[ref]: https://example.com",
    "<!-- note -->",
    "<!--\nNote\n-->",
    "```md\nFalse title\n===\n```",
    "~~~\nFalse title\n---\n~~~",
  ]) {
    test(`Setext paragraph starts after ${JSON.stringify(boundary)} (${name})`, () => {
      const prefix = boundary.replaceAll("\n", eol) + eol + (/^(?:>|- Item|1\. Item)/.test(boundary) ? eol : "");
      const heading = ["First line", "Second line", "===", "Body", ""].join(eol);
      const sections = sheetSections(prefix + heading);
      assert.deepEqual(
        sections.map((s) => s.title),
        [...(boundary ? [boundary === "# Parent" ? "Parent" : "Introduction"] : []), "First line Second line"],
      );
      const section = sections.at(-1);
      assert.equal(section.title, "First line Second line");
      assert.equal(section.line, prefix.split(eol).length);
      assert.equal(section.source, heading);
    });
  }

  test(`HTML comments do not create headings (${name})`, () => {
    const source = ["<!--", "False", "heading", "===", "# Also false", "-->", "# Next", ""].join(eol);
    assert.deepEqual(
      sheetSections(source).map((s) => s.title),
      ["Introduction", "Next"],
    );
  });

  for (const block of ["***", "___", "- - -", "> Quote", "- Item", "1. Item", "    code", "\tcode", "# ATX"]) {
    test(`an underline after ${JSON.stringify(block)} is not a Setext heading (${name})`, () => {
      const source = [block, "---", "", "# Next", ""].join(eol);
      assert.deepEqual(
        sheetSections(source).map((s) => s.title),
        [block === "# ATX" ? "ATX" : "Introduction", "Next"],
      );
    });
  }

  test(`blank lines separate paragraphs and horizontal rules (${name})`, () => {
    const source = ["Preamble", "", "---", "", "First", "Second", "---", "", "Another", "Paragraph", "===", ""].join(
      eol,
    );
    const sections = sheetSections(source);
    assert.deepEqual(
      sections.map((s) => [s.title, s.line]),
      [
        ["Introduction", 1],
        ["First Second", 5],
        ["Another Paragraph", 9],
      ],
    );
    assert.equal(sections.map((s) => s.source).join(""), source);
  });
}
