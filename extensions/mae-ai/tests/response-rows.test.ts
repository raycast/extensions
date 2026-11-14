import assert from "node:assert/strict";
import test from "node:test";
import { responseRows } from "../src/lib/response-rows";

test("streamed Markdown is rendered as readable full-width rows rather than a separate form", () => {
  assert.deepEqual(
    responseRows("# hello\n\n**noun**\nA `greeting`.\n*say hello*"),
    ["hello", "noun", "A greeting.", "say hello"],
  );
  assert.deepEqual(responseRows("First token"), ["First token"]);
  assert.deepEqual(responseRows("First token\nSecond token"), [
    "First token",
    "Second token",
  ]);
});

test("long lines wrap at words and preserve all text", () => {
  const text = "one two three four five six seven eight";
  const rows = responseRows(text, 14);
  assert.ok(rows.every((row) => row.length <= 14));
  assert.equal(rows.join(" "), text);
  assert.deepEqual(responseRows("世界你好", 4), ["世界", "你好"]);
  assert.deepEqual(responseRows("😀😀😀", 4), ["😀😀", "😀"]);
  assert.deepEqual(responseRows("abcdefgh", 3), ["abc", "def", "gh"]);
});
