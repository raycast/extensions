import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveMergeTargetRef } from "../infrastructure/git-worktree-metadata-store";
import { saveBaseRefForBranchConfig, saveBaseRefForWorktreePath } from "../infrastructure/worktree-base-ref-store";

const execFileAsync = promisify(execFile);

async function execGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["--no-optional-locks", ...args], { cwd });
}

async function createTestRepo(): Promise<{ repoPath: string; storageDir: string }> {
  const repoPath = await mkdtemp(join(tmpdir(), "worktree-merge-target-repo-"));
  const storageDir = await mkdtemp(join(tmpdir(), "worktree-merge-target-home-"));
  process.env.HOME = storageDir;

  await execGit(repoPath, ["init", "-b", "main"]);
  await execGit(repoPath, ["config", "user.email", "test@example.com"]);
  await execGit(repoPath, ["config", "user.name", "Test User"]);
  await writeFile(join(repoPath, "README.md"), "hello");
  await execGit(repoPath, ["add", "README.md"]);
  await execGit(repoPath, ["commit", "-m", "init commit"]);
  await execGit(repoPath, ["checkout", "-b", "feature/test"]);
  return { repoPath, storageDir };
}

describe("resolveMergeTargetRef", () => {
  let repoPath = "";
  let storageDir = "";
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    const setup = await createTestRepo();
    repoPath = setup.repoPath;
    storageDir = setup.storageDir;
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await Promise.all([
      repoPath ? rm(repoPath, { recursive: true, force: true }) : Promise.resolve(),
      storageDir ? rm(storageDir, { recursive: true, force: true }) : Promise.resolve(),
    ]);
    repoPath = "";
    storageDir = "";
    originalHome = undefined;
  });

  it("保存済みの branch 設定があれば storage より優先して返す", async () => {
    await saveBaseRefForBranchConfig({
      worktreePath: repoPath,
      branch: "feature/test",
      baseRef: " origin/main ",
    });
    await saveBaseRefForWorktreePath(repoPath, " origin/dev ");

    const actual = await resolveMergeTargetRef(repoPath);
    expect(actual).toBe("origin/main");
  });

  it("branch 設定が無い場合は保存済み worktree path の baseRef を返す", async () => {
    await saveBaseRefForWorktreePath(repoPath, " origin/dev ");

    const actual = await resolveMergeTargetRef(repoPath);
    expect(actual).toBe("origin/dev");
  });

  it("branch 設定から baseRef を返す", async () => {
    await execGit(repoPath, ["checkout", "-b", "__base-ref"]);
    await execGit(repoPath, ["config", 'branch."__base-ref".worktreeDeckBaseRef', "main"]);

    const actual = await resolveMergeTargetRef(repoPath);
    expect(actual).toBe("main");
  });
});
