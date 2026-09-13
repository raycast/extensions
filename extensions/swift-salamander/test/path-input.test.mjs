import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeLocalPath } from "../src/path-input.ts";

test("a tilde opens the home directory", () => {
  assert.equal(normalizeLocalPath("~"), homedir());
});

test("a tilde-prefixed path expands from the home directory", () => {
  assert.equal(normalizeLocalPath("~/Downloads"), join(homedir(), "Downloads"));
});
