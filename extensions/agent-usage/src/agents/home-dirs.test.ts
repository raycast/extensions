import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

test("parseAdditionalHomes splits on commas and newlines", async () => {
  const { parseAdditionalHomes } = await import("./home-dirs.ts");

  assert.deepEqual(parseAdditionalHomes("/a,/b\n/c", "/home/user"), [
    path.resolve("/a"),
    path.resolve("/b"),
    path.resolve("/c"),
  ]);
});

test("parseAdditionalHomes trims blanks and ignores empty entries", async () => {
  const { parseAdditionalHomes } = await import("./home-dirs.ts");

  assert.deepEqual(parseAdditionalHomes("  /a  , ,\n\n  /b ", "/home/user"), [path.resolve("/a"), path.resolve("/b")]);
});

test("parseAdditionalHomes expands a bare tilde and tilde-prefixed paths", async () => {
  const { parseAdditionalHomes } = await import("./home-dirs.ts");

  assert.deepEqual(parseAdditionalHomes("~, ~/.claude-work", "/home/user"), [
    path.resolve("/home/user"),
    path.resolve("/home/user/.claude-work"),
  ]);
});

test("parseAdditionalHomes de-duplicates entries that resolve to the same path", async () => {
  const { parseAdditionalHomes } = await import("./home-dirs.ts");

  assert.deepEqual(parseAdditionalHomes("~/.claude-work, /home/user/.claude-work/", "/home/user"), [
    path.resolve("/home/user/.claude-work"),
  ]);
});

test("parseAdditionalHomes returns an empty list for blank input", async () => {
  const { parseAdditionalHomes } = await import("./home-dirs.ts");

  assert.deepEqual(parseAdditionalHomes("", "/home/user"), []);
  assert.deepEqual(parseAdditionalHomes("   ", "/home/user"), []);
});
