import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  assertPrunePreviewParity,
  buildWorktreeCommand,
  canRemoveWorktree,
  formatPrunePreview,
  parseGitStatusPorcelain,
  parseGitWorktreePorcelain,
  worktreePathIdentity,
} from "../src/lib/worktree-core.ts";

const execFilePromise = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFilePromise("git", args, {
    cwd,
    encoding: "utf8",
  });
  return stdout;
}

async function gitCapture(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFilePromise("git", args, { cwd, encoding: "utf8" });
}

test("matches Git porcelain and removes only a clean linked worktree", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-worktrees-"),
  );
  const main = path.join(root, "main");
  const linked = path.join(root, "linked feature");
  await fs.promises.mkdir(main);
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  await git(main, ["init"]);
  await fs.promises.writeFile(path.join(main, "README.md"), "fixture\n");
  await git(main, ["add", "README.md"]);
  await git(main, [
    "-c",
    "user.name=ClaudeCast Tests",
    "-c",
    "user.email=tests@example.com",
    "commit",
    "-m",
    "fixture",
  ]);
  await git(main, ["worktree", "add", "-b", "feature/test", linked]);

  const records = parseGitWorktreePorcelain(
    await git(main, ["worktree", "list", "--porcelain", "-z"]),
  );
  const linkedRealPath = await fs.promises.realpath(linked);
  assert.equal(records.length, 2);
  assert.equal(records[0].isMain, true);
  assert.equal(
    worktreePathIdentity(records[1].path),
    worktreePathIdentity(linkedRealPath),
  );
  assert.equal(records[1].branch, "feature/test");

  await fs.promises.writeFile(path.join(linked, "dirty.txt"), "dirty\n");
  const dirtyStatus = parseGitStatusPorcelain(
    await git(linked, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=normal",
    ]),
  );
  assert.equal(dirtyStatus.untracked, 1);
  assert.equal(canRemoveWorktree(records[1], dirtyStatus).allowed, false);

  await fs.promises.rm(path.join(linked, "dirty.txt"));
  const cleanStatus = parseGitStatusPorcelain(
    await git(linked, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=normal",
    ]),
  );
  assert.equal(canRemoveWorktree(records[1], cleanStatus).allowed, true);
  await git(main, buildWorktreeCommand("remove", linkedRealPath));
  assert.equal(fs.existsSync(linked), false);

  const prunable = path.join(root, "prunable");
  const moved = path.join(root, "moved outside worktree registry");
  await git(main, ["worktree", "add", "-b", "feature/prunable", prunable]);
  await fs.promises.rename(prunable, moved);
  const args = [
    "worktree",
    "prune",
    "--dry-run",
    "--verbose",
    "--expire",
    "now",
  ];
  const firstPreviewResult = await gitCapture(main, args);
  assert.equal(firstPreviewResult.stdout.trim(), "");
  const preview = formatPrunePreview(
    firstPreviewResult.stdout,
    firstPreviewResult.stderr,
  );
  assert.match(preview, /prunable/i);
  const secondPreviewResult = await gitCapture(main, args);
  assert.doesNotThrow(() =>
    assertPrunePreviewParity(
      preview,
      formatPrunePreview(
        secondPreviewResult.stdout,
        secondPreviewResult.stderr,
      ),
    ),
  );
  await git(main, ["worktree", "prune", "--verbose", "--expire", "now"]);
  assert.equal(
    parseGitWorktreePorcelain(
      await git(main, ["worktree", "list", "--porcelain", "-z"]),
    ).length,
    1,
  );
});
