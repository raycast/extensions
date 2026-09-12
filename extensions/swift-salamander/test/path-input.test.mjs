import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { finderPathInput, normalizeLocalPath } from "../src/path-input.ts";

test("a tilde opens the home directory", () => {
  assert.equal(normalizeLocalPath("~"), homedir());
});

test("a tilde-prefixed path expands from the home directory", () => {
  assert.equal(normalizeLocalPath("~/Downloads"), join(homedir(), "Downloads"));
});

test("a Finder path round-trips without trimming whitespace", () => {
  const path = "/tmp/ report ";
  assert.equal(normalizeLocalPath(finderPathInput(path)), path);
});
