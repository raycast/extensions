import test from "node:test";
import assert from "node:assert/strict";
import { buildFrontmatter, combineFrontmatterAndBody } from "../src/lib/frontmatter";
import type { ExtractedArticle } from "../src/lib/extract";

function article(overrides: Partial<ExtractedArticle> = {}): ExtractedArticle {
  return {
    sourceUrl: "https://example.com/post",
    bodyMarkdown: "Body text.",
    ...overrides,
  };
}

test("buildFrontmatter always records the source URL and saved date", () => {
  const fm = buildFrontmatter(article(), false);

  assert.equal(fm.sourceURL, "https://example.com/post");
  assert.match(fm.savedDate, /^\d{4}-\d{2}-\d{2}T/);
});

test("buildFrontmatter only adds title and author when asked", () => {
  const extracted = article({ title: "A Title", author: "Jane Doe" });

  const without = buildFrontmatter(extracted, false);
  assert.equal(without.title, undefined);
  assert.equal(without.author, undefined);

  const with_ = buildFrontmatter(extracted, true);
  assert.equal(with_.title, "A Title");
  assert.equal(with_.author, "Jane Doe");
});

test("combineFrontmatterAndBody emits body only when there is no frontmatter", () => {
  assert.equal(combineFrontmatterAndBody(null, "  # Hi  "), "# Hi\n");
});

test("a newline in a title cannot break out of the frontmatter block", () => {
  // Readability only collapses runs of 2+ whitespace chars, so a single
  // newline inside <title> reaches us verbatim.
  const output = combineFrontmatterAndBody(
    buildFrontmatter(article({ title: 'Innocent\n---\ninjected: yes\ntitle: "Pwned"' }), true),
    "Body text.",
  );

  // Exactly two --- delimiters: the block open and close.
  assert.equal(output.match(/^---$/gm)?.length, 2);
  assert.doesNotMatch(output, /^injected:/m);
  assert.match(output, /^title: "Innocent\\n---\\ninjected/m);
});

test("quotes, backslashes, tabs and control characters are escaped", () => {
  const fm = buildFrontmatter(article({ title: 'He said "hi"\\done\there\u0007' }), true);
  const output = combineFrontmatterAndBody(fm, "Body text.");

  const titleLine = output.split("\n").find((line) => line.startsWith("title:"));
  assert.ok(titleLine, "expected a title line");
  assert.equal(titleLine, 'title: "He said \\"hi\\"\\\\done\\there\\x07"');
});
