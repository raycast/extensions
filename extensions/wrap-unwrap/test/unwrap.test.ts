import { test } from "node:test";
import assert from "node:assert/strict";
import { unwrap } from "../src/lib/unwrap.js";

const dflt = { hyphenation: true, keepBlankLines: false };

test("unwrap joins consecutive prose lines with a single space", () => {
  const input = "alpha\nbeta\ngamma";
  assert.equal(unwrap(input, dflt), "alpha beta gamma");
});

test("unwrap preserves paragraph breaks via blank lines", () => {
  const input = "alpha\nbeta\n\ngamma\ndelta";
  assert.equal(unwrap(input, dflt), "alpha beta\n\ngamma delta");
});

test("unwrap collapses multiple blank lines by default", () => {
  const input = "alpha\n\n\n\nbeta";
  assert.equal(unwrap(input, dflt), "alpha\n\nbeta");
});

test("unwrap preserves blank-line runs when keepBlankLines is on", () => {
  const input = "alpha\n\n\nbeta";
  assert.equal(unwrap(input, { ...dflt, keepBlankLines: true }), "alpha\n\n\nbeta");
});

test("unwrap leaves fenced code untouched", () => {
  const input = "intro\n```\nline 1\nline 2\n```\nafter";
  assert.equal(unwrap(input, dflt), "intro\n```\nline 1\nline 2\n```\nafter");
});

test("unwrap leaves headings on their own line", () => {
  const input = "# Title\nbody one\nbody two";
  assert.equal(unwrap(input, dflt), "# Title\nbody one body two");
});

test("unwrap reflows blockquote content within depth", () => {
  const input = "> quote\n> continues here";
  assert.equal(unwrap(input, dflt), "> quote continues here");
});

test("unwrap respects nested blockquote depth", () => {
  const input = "> outer\n> > inner\n> > more inner";
  assert.equal(unwrap(input, dflt), "> outer\n> > inner more inner");
});

test("unwrap merges list-item continuation lines", () => {
  const input = "- item one\n  continues\n- item two";
  assert.equal(unwrap(input, dflt), "- item one continues\n- item two");
});

test("unwrap strips soft hyphens when enabled", () => {
  const input = "an inter-\nesting word";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "an interesting word");
});

test("unwrap leaves single-line compounds alone (not split, no hyphenation runs)", () => {
  const input = "state-of-the-art";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "state-of-the-art");
});

test("unwrap preserves capital-led split words (no strip, but joined with space)", () => {
  // The hyphen rule excludes capital-led runs. The hyphen stays; lines join with a space.
  const input = "A State-\nwide policy";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "A State- wide policy");
});

test("unwrap mid-compound break — known v1 limitation: gains a space", () => {
  // The hyphen rule excludes mid-compound breaks (lowercase run preceded by `-`).
  // The hyphen stays; lines join with a space. Documented limitation.
  const input = "the state-of-the-\nart";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "the state-of-the- art");
});

test("unwrap with hyphenation off keeps the hyphen verbatim", () => {
  const input = "an inter-\nesting word";
  assert.equal(unwrap(input, { ...dflt, hyphenation: false }), "an inter- esting word");
});

test("unwrap protects inline code from joins", () => {
  const input = "see `foo bar`\ndocs";
  assert.equal(unwrap(input, dflt), "see `foo bar` docs");
});

test("unwrap protects inline links", () => {
  const input = "go to [the docs](https://x.test/a b)\nplease";
  assert.equal(unwrap(input, dflt), "go to [the docs](https://x.test/a b) please");
});

test("unwrap preserves hard-break-terminated lines", () => {
  const input = "line one  \nline two";
  // The hard-break terminates the reflow group.
  assert.equal(unwrap(input, dflt), "line one  \nline two");
});

test("unwrap handles empty input", () => {
  assert.equal(unwrap("", dflt), "");
});

test("unwrap normalizes CRLF line endings", () => {
  assert.equal(unwrap("a\r\nb\r\nc", dflt), "a b c");
});

test("unwrap preserves nested list indentation", () => {
  // Round-trip preserves the 2-space indent on the nested item.
  const input = "- outer\n  * nested";
  assert.equal(unwrap(input, dflt), "- outer\n  * nested");
});

test("unwrap preserves multi-space gap after list marker", () => {
  // A 3-space gap between marker and content is intentional alignment.
  const input = "-   item one\n-   item two";
  assert.equal(unwrap(input, dflt), "-   item one\n-   item two");
});
