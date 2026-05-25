import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorktree } from "../infrastructure/worktree-create-store";

const execFileAsync = promisify(execFile);

/**
 * git コマンドを実行する
 */
async function execGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", ["--no-optional-locks", ...args], { cwd });
}

/**
 * テスト用リポジトリを初期化する
 */
async function createTestRepository(rootDir: string): Promise<string> {
  const repoPath = join(rootDir, "repo");
  await mkdir(repoPath, { recursive: true });
  await execGit(repoPath, ["init", "-b", "main"]);
  await execGit(repoPath, ["config", "user.email", "test@example.com"]);
  await execGit(repoPath, ["config", "user.name", "Test User"]);
  await writeFile(join(repoPath, "README.md"), "hello\n", "utf8");
  await execGit(repoPath, ["add", "README.md"]);
  await execGit(repoPath, ["commit", "-m", "init"]);
  return repoPath;
}

/**
 * worktree 作成用の環境変数を設定する
 */
async function configureWorktreeEnvironment(rootDir: string): Promise<{ worktreeBasePath: string }> {
  const worktreeBasePath = join(rootDir, "worktrees");
  await mkdir(worktreeBasePath, { recursive: true });
  vi.stubEnv("GIT_WORKTREE_PATH", worktreeBasePath);
  vi.stubEnv("HOME", rootDir);
  return { worktreeBasePath };
}

/**
 * worker による非同期コピー完了を待って lstat 結果を返す
 */
async function waitForLstat(path: string): ReturnType<typeof lstat> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      return await lstat(path);
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }
  }
  return lstat(path);
}

/**
 * detached worker が root 削除と競合しないように終了を待つ
 */
async function waitForCopyJobsFinished(storagePath: string): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const statuses = await loadCopyJobStatuses(storagePath);
    if (statuses.length === 0 || statuses.every((status) => status === "succeeded" || status === "failed")) {
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
}

/**
 * コピー job 状態ファイルから status 一覧を読む
 */
async function loadCopyJobStatuses(storagePath: string): Promise<string[]> {
  const jobDir = join(storagePath, "copy-jobs");
  try {
    const entries = await readdir(jobDir);
    const statuses = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          const content = await readFile(join(jobDir, entry), "utf8");
          const parsed = JSON.parse(content) as { status?: string };
          return parsed.status ?? "unknown";
        }),
    );
    return statuses;
  } catch {
    return [];
  }
}

/**
 * ブランチ設定の baseRef を取得する
 */
async function loadBranchBaseRef(args: { repoPath: string; branch: string }): Promise<string | null> {
  const key = `branch."${args.branch}".worktreeDeckBaseRef`;
  try {
    const { stdout } = await execGit(args.repoPath, ["config", "--get", key]);
    const value = stdout.trim();
    if (value) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

describe("createWorktree", () => {
  const createdRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(createdRoots.map((path) => waitForCopyJobsFinished(join(path, ".worktree-deck", "storage"))));
    await Promise.all(createdRoots.map((path) => rm(path, { recursive: true, force: true })));
    createdRoots.length = 0;
    vi.unstubAllEnvs();
  });

  it("ベースブランチを指定して作成したら branch config に baseRef を保存する", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    await configureWorktreeEnvironment(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");

    const result = await createWorktree({
      repoRoot: repoPath,
      branch: "feature/test",
      startPoint: "main",
      scriptPath,
      mapValue: "repo",
    });

    expect(result.createdPath).toBeTruthy();
    const storedBaseRef = await loadBranchBaseRef({ repoPath, branch: "feature/test" });
    expect(storedBaseRef).toBe("main");
  });

  it("startPoint 未指定で作成した場合は branch config に baseRef を保存しない", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    await configureWorktreeEnvironment(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");

    const result = await createWorktree({
      repoRoot: repoPath,
      branch: "feature/no-base",
      scriptPath,
      mapValue: "repo",
    });

    expect(result.createdPath).toBeTruthy();
    const storedBaseRef = await loadBranchBaseRef({ repoPath, branch: "feature/no-base" });
    expect(storedBaseRef).toBeNull();
  }, 15000);

  it("既存ブランチを再利用する場合は既存の baseRef を上書きしない", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    await configureWorktreeEnvironment(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");

    await execGit(repoPath, ["checkout", "-b", "develop"]);
    await execGit(repoPath, ["checkout", "main"]);
    await execGit(repoPath, ["checkout", "-b", "feature/reuse"]);
    await execGit(repoPath, ["checkout", "main"]);
    await execGit(repoPath, ["config", 'branch."feature/reuse".worktreeDeckBaseRef', "main"]);

    const result = await createWorktree({
      repoRoot: repoPath,
      branch: "feature/reuse",
      startPoint: "develop",
      scriptPath,
      mapValue: "repo",
    });

    expect(result.createdPath).toBeTruthy();
    const storedBaseRef = await loadBranchBaseRef({ repoPath, branch: "feature/reuse" });
    expect(storedBaseRef).toBe("main");
  }, 15000);

  it("shell asset は process env の GIT_WORKTREE_PATH の home path を展開する", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");

    const { stdout } = await execFileAsync(scriptPath, ["feature/home-path", "main", "--map-value", "repo"], {
      cwd: repoPath,
      env: {
        ...process.env,
        HOME: rootDir,
        GIT_WORKTREE_PATH: "~/.worktree-deck/worktrees",
        WORKTREE_REPO_ROOT: repoPath,
      },
    });

    const expectedPath = join(rootDir, ".worktree-deck", "worktrees", "repo", "feature", "home-path");
    expect(stdout).toContain(`Created worktree: ${expectedPath}`);
    expect(await lstat(expectedPath)).toBeTruthy();
    const storedBaseRef = await loadBranchBaseRef({ repoPath, branch: "feature/home-path" });
    expect(storedBaseRef).toBe("main");
  }, 15000);

  it("未追跡のリンク切れシムリンクをシムリンクのままコピーする", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    const { worktreeBasePath } = await configureWorktreeEnvironment(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");
    await symlink("missing-target.txt", join(repoPath, "untracked-link"));

    const result = await createWorktree({
      repoRoot: repoPath,
      branch: "feature/symlink",
      startPoint: "main",
      scriptPath,
      mapValue: "repo",
    });

    const copiedLink = join(worktreeBasePath, "repo", "feature", "symlink", "untracked-link");
    const copiedStat = await waitForLstat(copiedLink);
    expect(result.createdPath).toBe(join(worktreeBasePath, "repo", "feature", "symlink"));
    expect(copiedStat.isSymbolicLink()).toBe(true);
    expect(await readlink(copiedLink)).toBe("missing-target.txt");
  }, 15000);

  it("ignored 一覧が大きくても .env シムリンクをコピーする", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-lib-"));
    createdRoots.push(rootDir);
    const repoPath = await createTestRepository(rootDir);
    const { worktreeBasePath } = await configureWorktreeEnvironment(rootDir);
    const scriptPath = resolve(__dirname, "../../assets/git_worktree_wrap.sh");
    const longPathSegment = "long-path-segment-".repeat(12);
    const ignoredDir = join(repoPath, "ignored-large", longPathSegment, longPathSegment, longPathSegment);
    await mkdir(ignoredDir, { recursive: true });
    await writeFile(join(repoPath, ".gitignore"), ".env\nignored-large/\n", "utf8");
    await symlink("secret.env", join(repoPath, ".env"));
    for (let index = 0; index < 2400; index += 1) {
      const paddedIndex = String(index).padStart(4, "0");
      await writeFile(join(ignoredDir, `ignored-${paddedIndex}.txt`), "", "utf8");
    }

    const result = await createWorktree({
      repoRoot: repoPath,
      branch: "feature/large-ignored",
      startPoint: "main",
      scriptPath,
      mapValue: "repo",
    });

    const copiedLink = join(worktreeBasePath, "repo", "feature", "large-ignored", ".env");
    const copiedStat = await waitForLstat(copiedLink);
    expect(result.createdPath).toBe(join(worktreeBasePath, "repo", "feature", "large-ignored"));
    expect(copiedStat.isSymbolicLink()).toBe(true);
    expect(await readlink(copiedLink)).toBe("secret.env");
  }, 30000);
});
