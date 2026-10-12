import assert from "node:assert/strict";
import { test } from "node:test";
import { fileTitle, parseSearchOutput } from "../src/file-search";

test("parseSearchOutput trims, dedupes, and caps", () => {
  const stdout = "/a/b.md\n  /c/d.txt  \n\n/a/b.md\n/e/f\n";
  assert.deepEqual(parseSearchOutput(stdout), ["/a/b.md", "/c/d.txt", "/e/f"]);
  assert.deepEqual(parseSearchOutput(stdout, 2), ["/a/b.md", "/c/d.txt"]);
  assert.deepEqual(parseSearchOutput(""), []);
});

test("fileTitle returns the last path segment", () => {
  assert.equal(fileTitle("/Users/me/Documents/Notes/daily.md"), "daily.md");
  assert.equal(fileTitle("/Users/me"), "me");
});
