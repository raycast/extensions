import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeDirectoryNames, sanitizeExtensions, validateGlob, validateQuery } from "./validation.ts";

test("valid globs pass, corrupting values are rejected", () => {
  assert.equal(validateGlob("*.{ts,tsx}"), null);
  assert.equal(validateGlob("!**/generated/**"), null);
  assert.equal(validateGlob("")?.kind, "invalid-glob");
  assert.equal(validateGlob("  ")?.kind, "invalid-glob");
  assert.equal(validateGlob("a\0b")?.kind, "invalid-glob");
  assert.equal(validateGlob("a\nb")?.kind, "invalid-glob");
});

test("query validation: text mode accepts anything non-empty", () => {
  assert.equal(validateQuery("([{", "text"), null);
  assert.equal(validateQuery("", "text")?.kind, "invalid-query");
});

test("query validation: regex mode rejects invalid patterns", () => {
  assert.equal(validateQuery("foo.*bar", "regex"), null);
  assert.equal(validateQuery("([", "regex")?.kind, "invalid-query");
});

test("extension sanitization strips dots and drops unsafe values", () => {
  assert.deepEqual(sanitizeExtensions([".ts", "tsx", "c++", "a b", "*", "..md", ""]), ["ts", "tsx", "c++", "md"]);
});

test("directory-name sanitization drops paths and glob metacharacters", () => {
  assert.deepEqual(sanitizeDirectoryNames(["node_modules", ".git", "a/b", "x*", "", " dist "]), [
    "node_modules",
    ".git",
    "dist",
  ]);
});
