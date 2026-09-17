import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPrunePreviewParity,
  buildWorktreeCommand,
  canRemoveWorktree,
  formatPrunePreview,
  parseGitStatusPorcelain,
  parseGitWorktreePorcelain,
  worktreePathIdentity,
} from "../src/lib/worktree-core.ts";

test("parses NUL-delimited Git worktree porcelain output", () => {
  const output = [
    "worktree /repo/main",
    `HEAD ${"a".repeat(40)}`,
    "branch refs/heads/main",
    "",
    "worktree /repo/feature with space",
    `HEAD ${"b".repeat(40)}`,
    "branch refs/heads/feature/test",
    "locked Claude agent is active",
    "",
    "worktree /repo/missing",
    `HEAD ${"c".repeat(40)}`,
    "detached",
    "prunable gitdir file points to missing location",
    "",
  ].join("\0");
  const records = parseGitWorktreePorcelain(output);

  assert.equal(records.length, 3);
  assert.equal(records[0].isMain, true);
  assert.equal(records[0].branch, "main");
  assert.equal(records[1].path, "/repo/feature with space");
  assert.equal(records[1].locked, true);
  assert.equal(records[1].lockReason, "Claude agent is active");
  assert.equal(records[2].detached, true);
  assert.equal(records[2].prunable, true);
});

test("captures prune stderr and rejects changed previews", () => {
  const preview = formatPrunePreview(
    "",
    "Removing worktrees/feature: gitdir is missing",
  );
  assert.equal(preview, "Removing worktrees/feature: gitdir is missing");
  assert.doesNotThrow(() => assertPrunePreviewParity(preview, preview));
  assert.throws(
    () =>
      assertPrunePreviewParity(preview, `${preview}\nRemoving worktrees/other`),
    /Set Changed/,
  );
});

test("parses staged, modified, untracked, conflicted, and renamed paths", () => {
  const status = parseGitStatusPorcelain(
    [
      "M  staged.ts",
      " M modified.ts",
      "?? new file.ts",
      "UU conflict.ts",
      "R  renamed.ts",
      "old.ts",
      "",
    ].join("\0"),
  );

  assert.equal(status.staged, 3);
  assert.equal(status.modified, 2);
  assert.equal(status.untracked, 1);
  assert.equal(status.conflicted, 1);
  assert.equal(status.isClean, false);
  assert.deepEqual(status.paths, [
    "staged.ts",
    "modified.ts",
    "new file.ts",
    "conflict.ts",
    "renamed.ts",
    "old.ts",
  ]);
});

test("blocks unsafe worktree removal", () => {
  const base = {
    path: "/repo/feature",
    detached: false,
    bare: false,
    locked: false,
    prunable: false,
    isMain: false,
  };
  const clean = {
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicted: 0,
    paths: [],
    isClean: true,
  };
  assert.equal(
    canRemoveWorktree({ ...base, isMain: true }, clean).allowed,
    false,
  );
  assert.equal(
    canRemoveWorktree({ ...base, locked: true }, clean).allowed,
    false,
  );
  assert.equal(
    canRemoveWorktree({ ...base, prunable: true }, undefined).allowed,
    false,
  );
  assert.equal(
    canRemoveWorktree(base, { ...clean, modified: 1, isClean: false }).allowed,
    false,
  );
  assert.equal(canRemoveWorktree(base, clean).allowed, true);
});

test("builds argument arrays and normalizes Windows identities", () => {
  assert.deepEqual(
    buildWorktreeCommand("remove", "C:\\Repo & Tools\\feature"),
    ["worktree", "remove", "--", "C:\\Repo & Tools\\feature"],
  );
  assert.deepEqual(buildWorktreeCommand("lock", "/repo/feature", "Agent 1"), [
    "worktree",
    "lock",
    "--reason",
    "Agent 1",
    "--",
    "/repo/feature",
  ]);
  assert.equal(
    worktreePathIdentity("C:\\Users\\Me\\Repo", "win32"),
    worktreePathIdentity("c:\\users\\me\\repo", "win32"),
  );
});
