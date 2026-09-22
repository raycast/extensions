import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeMarkdownHtml } from "./markdown.ts";

test("escapes angle brackets in prose", () => {
  assert.equal(escapeMarkdownHtml("display errors with <ErrorMessage>"), "display errors with &lt;ErrorMessage>");
});

test("leaves an inline code span untouched", () => {
  assert.equal(escapeMarkdownHtml("render `<T>` as-is, escape <U>"), "render `<T>` as-is, escape &lt;U>");
});

test("leaves a fenced code block untouched", () => {
  const input = ["before <A>", "```tsx", "const node = <T>value</T>;", "```", "after <B>"].join("\n");
  const expected = ["before &lt;A>", "```tsx", "const node = <T>value</T>;", "```", "after &lt;B>"].join("\n");
  assert.equal(escapeMarkdownHtml(input), expected);
});

test("returns text without angle brackets unchanged", () => {
  const input = "plain text\n\nwith `code` and a list:\n- item\n";
  assert.equal(escapeMarkdownHtml(input), input);
});

test("leaves a double-backtick span containing a backtick untouched", () => {
  assert.equal(escapeMarkdownHtml("``a ` <T>`` then <U>"), "``a ` <T>`` then &lt;U>");
});

test("keeps blockquote markers intact", () => {
  assert.equal(escapeMarkdownHtml("> quoted <X>\n> more"), "> quoted &lt;X>\n> more");
});
