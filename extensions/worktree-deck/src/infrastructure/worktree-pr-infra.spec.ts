import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultCreateWorktreePullRequestDependencies, resolveFirstCommitTitle } from "./worktree-pr-infra";

/**
 * execFile を Promise 化したもの
 */
const execFileAsync = promisify(execFile);

/**
 * コミット日時の基準値
 */
const BASE_COMMIT_DATE = new Date("2020-01-01T00:00:00.000Z");

/**
 * コミット日時を生成する
 */
function buildCommitDate(index: number): string {
  return new Date(BASE_COMMIT_DATE.getTime() + index * 1000).toISOString();
}

/**
 * git コマンドを実行する
 */
async function execGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args], { cwd });
}

/**
 * テスト用のリポジトリを初期化する
 */
async function initTestRepo(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "worktree-pr-"));
  await execGit(repoRoot, ["init", "-b", "main"]);
  await execGit(repoRoot, ["config", "user.email", "test@example.com"]);
  await execGit(repoRoot, ["config", "user.name", "Test User"]);
  return repoRoot;
}

/**
 * テスト用コミットを作成する
 */
async function commitFile(repoRoot: string, fileName: string, message: string, commitDate: string): Promise<void> {
  const filePath = join(repoRoot, fileName);
  await writeFile(filePath, message);
  await execGit(repoRoot, ["add", fileName]);
  await execFileAsync("git", ["-C", repoRoot, "commit", "-m", message, "--no-gpg-sign"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: commitDate,
      GIT_COMMITTER_DATE: commitDate,
    },
  });
}

describe("resolveFirstCommitTitle", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await initTestRepo();
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  it("returns first commit title between base and head", async () => {
    await commitFile(repoRoot, "README.md", "chore: init", buildCommitDate(0));
    await execGit(repoRoot, ["checkout", "-b", "feature/test"]);
    await commitFile(repoRoot, "first.txt", "feat: first commit", buildCommitDate(1));
    await commitFile(repoRoot, "second.txt", "feat: second commit", buildCommitDate(2));

    const title = await resolveFirstCommitTitle({ repoRoot, baseRef: "main", headRef: "feature/test" });

    expect(title).toBe("feat: first commit");
  });

  it("returns null when no commits exist between base and head", async () => {
    await commitFile(repoRoot, "README.md", "chore: init", buildCommitDate(0));
    await execGit(repoRoot, ["checkout", "-b", "feature/empty"]);

    const title = await resolveFirstCommitTitle({ repoRoot, baseRef: "main", headRef: "feature/empty" });

    expect(title).toBeNull();
  });
});

describe("createWorktreePullRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gh が見つからない場合は PR 作成用の案内エラーで失敗する", async () => {
    vi.stubEnv("PATH", "/path/without-gh");
    const dependencies = createDefaultCreateWorktreePullRequestDependencies();

    await expect(
      dependencies.createWorktreePullRequest({
        repoRoot: "/repos/app",
        worktreePath: "/worktrees/app",
        baseRef: "origin/main",
        baseBranch: "main",
        headBranch: "feature/test",
        remoteName: "origin",
        title: "Test PR",
        description: "",
        draft: true,
      }),
    ).rejects.toThrow("GitHub CLI (gh) is required to create pull requests. Install gh and run gh auth login.");
  });
});
