import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPathAllowedByExtensions,
  isPathAllowedByExtensions,
} from "../src/lib/file-policy.ts";

test("isPathAllowedByExtensions matches configured extension", () => {
  assert.equal(
    isPathAllowedByExtensions("/tmp/note.md", [
      ".txt",
      ".md",
      ".markdown",
      ".yaml",
      ".yml",
    ]),
    true,
  );
  assert.equal(
    isPathAllowedByExtensions("/tmp/config.yml", [
      ".txt",
      ".md",
      ".markdown",
      ".yaml",
      ".yml",
    ]),
    true,
  );
  assert.equal(
    isPathAllowedByExtensions("/tmp/script.py", [
      ".txt",
      ".md",
      ".markdown",
      ".yaml",
      ".yml",
    ]),
    false,
  );
});

test("extension check is case-insensitive by file path", () => {
  assert.equal(isPathAllowedByExtensions("/tmp/README.MD", [".md"]), true);
});

test("assertPathAllowedByExtensions throws for disallowed extension", () => {
  assert.throws(
    () =>
      assertPathAllowedByExtensions("/tmp/script.py", [
        ".txt",
        ".md",
        ".markdown",
        ".yaml",
        ".yml",
      ]),
    /Blocked by extension filter/,
  );
});
