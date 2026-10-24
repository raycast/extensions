import assert from "node:assert/strict";
import { test } from "node:test";
import { fileTitle, parseSearchOutput } from "../src/file-search";

test("parseSearchOutput keeps paths verbatim, dedupes, and caps", () => {
  const stdout = "/a/b.md\0/c/trailing \0\0/a/b.md\0/e/f\0";
  assert.deepEqual(parseSearchOutput(stdout), ["/a/b.md", "/c/trailing ", "/e/f"]);
  assert.deepEqual(parseSearchOutput(stdout, 2), ["/a/b.md", "/c/trailing "]);
  assert.deepEqual(parseSearchOutput(""), []);
});

test("fileTitle returns the last path segment", () => {
  assert.equal(fileTitle("/Users/me/Documents/Notes/daily.md"), "daily.md");
  assert.equal(fileTitle("/Users/me"), "me");
});
