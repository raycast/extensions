import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadBaseRefForBranchConfig } from "./worktree-base-ref-store";

const execFileAsync = promisify(execFile);

/**
 * git コマンドを実行する
 */
async function execGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["--no-optional-locks", ...args], { cwd });
}

/**
 * テスト用リポジトリを初期化する
 */
async function createTestRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), "worktree-base-ref-repo-"));
  await execGit(repoPath, ["init", "-b", "main"]);
  await execGit(repoPath, ["config", "user.email", "test@example.com"]);
  await execGit(repoPath, ["config", "user.name", "Test User"]);
  await writeFile(join(repoPath, "README.md"), "hello");
  await execGit(repoPath, ["add", "README.md"]);
  await execGit(repoPath, ["commit", "-m", "init commit"]);
  await execGit(repoPath, ["checkout", "-b", "__add1"]);
  return repoPath;
}

describe("loadBaseRefForBranchConfig", () => {
  let repoPath = "";

  beforeEach(async () => {
    repoPath = await createTestRepo();
  });

  afterEach(async () => {
    await (repoPath ? rm(repoPath, { recursive: true, force: true }) : Promise.resolve());
    repoPath = "";
  });

  it("branch config から baseRef を取得できる", async () => {
    await execGit(repoPath, ["config", 'branch."__add1".worktreeDeckBaseRef', "main"]);

    const actual = await loadBaseRefForBranchConfig({
      worktreePath: repoPath,
      branch: "__add1",
    });

    expect(actual).toBe("main");
  });
});
