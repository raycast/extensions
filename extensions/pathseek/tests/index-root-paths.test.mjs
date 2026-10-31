import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  normalizeIndexRoots,
  selectRebuildRoots,
} from "../src/lib/index-root-paths.ts";

test("folder-picker paths preserve significant leading and trailing spaces", () => {
  const root = path.join(os.tmpdir(), "PathSeek Root");
  assert.deepEqual(
    normalizeIndexRoots(["", root + " ", path.join(os.tmpdir(), " PathSeek Root"), root + " "]),
    [root + " ", path.join(os.tmpdir(), " PathSeek Root")],
  );
});

test("overlapping parents and subfolders collapse without removing sibling names", () => {
  const root = path.join(os.tmpdir(), "pathseek-docs");
  const sibling = path.join(os.tmpdir(), "pathseek-docs-backup");
  assert.deepEqual(
    normalizeIndexRoots([
      path.join(root, "src", "nested"),
      sibling,
      path.join(root, "src"),
      root,
      path.join(root, "README.md"),
      sibling,
    ]),
    [sibling, root],
  );
});

test("explicit rebuild bypasses an unreadable previous index", async () => {
  const root = path.join(os.tmpdir(), "pathseek-recovery");
  const failRead = async () => {
    throw new Error("Corrupt PathSeek index header");
  };
  assert.deepEqual(await selectRebuildRoots([root], failRead), [root]);
  assert.deepEqual(await selectRebuildRoots([], failRead), []);
});

test("rebuild without explicit roots uses stored configuration fallback", async () => {
  const root = path.join(os.tmpdir(), "pathseek-saved-root");
  let calls = 0;
  assert.deepEqual(
    await selectRebuildRoots(undefined, async () => {
      calls++;
      return [root];
    }),
    [root],
  );
  assert.equal(calls, 1);
});
