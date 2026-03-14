import assert from "node:assert/strict";
import test from "node:test";
import {
  getRelativeDepth,
  isPathExcluded,
} from "../src/lib/file-search-filters.ts";

test("getRelativeDepth counts levels under root", () => {
  assert.equal(getRelativeDepth("/tmp/root", "/tmp/root/a.txt"), 1);
  assert.equal(getRelativeDepth("/tmp/root", "/tmp/root/notes/a.txt"), 2);
  assert.equal(
    getRelativeDepth("/tmp/root", "/tmp/other/a.txt"),
    Number.POSITIVE_INFINITY,
  );
});

test("isPathExcluded matches segment excludes", () => {
  assert.equal(
    isPathExcluded("/tmp/root/notes/node_modules/lock.txt", "/tmp/root", [
      "node_modules",
    ]),
    true,
  );
  assert.equal(
    isPathExcluded("/tmp/root/notes/keep.txt", "/tmp/root", ["node_modules"]),
    false,
  );
});

test("isPathExcluded matches wildcard path excludes", () => {
  assert.equal(
    isPathExcluded("/tmp/root/archive/2026/day.md", "/tmp/root", ["archive/*"]),
    true,
  );
  assert.equal(
    isPathExcluded("/tmp/root/notes/archive.md", "/tmp/root", ["archive/*"]),
    false,
  );
});

test("isPathExcluded matches absolute path excludes", () => {
  assert.equal(
    isPathExcluded("/tmp/root/private/journal.txt", "/tmp/root", [
      "/tmp/root/private",
    ]),
    true,
  );
  assert.equal(
    isPathExcluded("/tmp/root/public/journal.txt", "/tmp/root", [
      "/tmp/root/private",
    ]),
    false,
  );
});
