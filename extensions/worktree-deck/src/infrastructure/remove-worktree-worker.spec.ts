import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

/**
 * テスト用 fake git 実行ファイルを作成する
 */
async function createFakeGit(args: { binDir: string; logPath: string }): Promise<void> {
  const gitPath = join(args.binDir, "git");
  await writeFile(
    gitPath,
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");

appendFileSync(process.env.FAKE_GIT_LOG, JSON.stringify({
  cwd: process.cwd(),
  args: process.argv.slice(2),
}) + "\\n");
process.stdout.write("ok\\n");
`,
    "utf8",
  );
  await chmod(gitPath, 0o755);
}

/**
 * Directory not empty で失敗する fake git 実行ファイルを作成する
 */
async function createDirectoryNotEmptyFakeGit(args: { binDir: string; logPath: string }): Promise<void> {
  const gitPath = join(args.binDir, "git");
  await writeFile(
    gitPath,
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");

appendFileSync(process.env.FAKE_GIT_LOG, JSON.stringify({
  cwd: process.cwd(),
  args: process.argv.slice(2),
}) + "\\n");
process.stderr.write("error: failed to delete '" + process.argv[process.argv.length - 1] + "': Directory not empty\\n");
process.exit(1);
`,
    "utf8",
  );
  await chmod(gitPath, 0o755);
}

/**
 * パスが存在するか判定する
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * fake git の呼び出し履歴を読み込む
 */
async function readFakeGitCalls(logPath: string): Promise<{ cwd: string; args: string[] }[]> {
  const body = await readFile(logPath, "utf8");
  return body
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as { cwd: string; args: string[] });
}

describe("remove_worktree_worker", () => {
  it("repoRoot が .git/worktrees 配下の場合は main repo root に補正して git を実行する", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-worker-"));
    const binDir = join(tempRoot, "bin");
    const repoRoot = join(tempRoot, "repo");
    const worktreeGitDir = join(repoRoot, ".git", "worktrees", "feature-x");
    const worktreePath = join(tempRoot, "worktrees", "repo~_~feature-x");
    const statePath = join(tempRoot, "job.json");
    const logPath = join(tempRoot, "git-calls.jsonl");
    await mkdir(binDir, { recursive: true });
    await mkdir(worktreeGitDir, { recursive: true });
    await mkdir(worktreePath, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify({
        id: "job-1",
        repoRoot: worktreeGitDir,
        worktreePath,
        status: "pending",
        createdAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
      }),
      "utf8",
    );
    await createFakeGit({ binDir, logPath });

    const workerPath = join(process.cwd(), "assets", "remove_worktree_worker.js");
    const payload = {
      id: "job-1",
      repoRoot: worktreeGitDir,
      worktreePath,
      statePath,
      workerPath,
      branch: null,
      deleteBranch: false,
      deleteRemoteBranch: false,
    };

    await execFileAsync(process.execPath, [workerPath, JSON.stringify(payload)], {
      env: {
        ...process.env,
        FAKE_GIT_LOG: logPath,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
    });

    const calls = await readFakeGitCalls(logPath);
    const realRepoRoot = await realpath(repoRoot);
    expect(calls[0]).toEqual({
      cwd: realRepoRoot,
      args: ["-C", repoRoot, "worktree", "remove", worktreePath],
    });
    await expect(readFile(statePath, "utf8")).resolves.toContain('"status": "succeeded"');
  });

  it("git remove 後に残ったディレクトリを削除して成功扱いにする", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-worker-"));
    const binDir = join(tempRoot, "bin");
    const repoRoot = join(tempRoot, "repo");
    const worktreePath = join(tempRoot, "worktrees", "repo~_~feature-x");
    const statePath = join(tempRoot, "job.json");
    const logPath = join(tempRoot, "git-calls.jsonl");
    await mkdir(binDir, { recursive: true });
    await mkdir(repoRoot, { recursive: true });
    await mkdir(worktreePath, { recursive: true });
    await writeFile(join(worktreePath, "ignored-output.txt"), "artifact\n", "utf8");
    await writeFile(
      statePath,
      JSON.stringify({
        id: "job-1",
        repoRoot,
        worktreePath,
        status: "pending",
        createdAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
      }),
      "utf8",
    );
    await createDirectoryNotEmptyFakeGit({ binDir, logPath });

    const workerPath = join(process.cwd(), "assets", "remove_worktree_worker.js");
    const payload = {
      id: "job-1",
      repoRoot,
      worktreePath,
      statePath,
      workerPath,
      branch: null,
      deleteBranch: false,
      deleteRemoteBranch: false,
    };

    await execFileAsync(process.execPath, [workerPath, JSON.stringify(payload)], {
      env: {
        ...process.env,
        FAKE_GIT_LOG: logPath,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      },
    });

    await expect(pathExists(worktreePath)).resolves.toBe(false);
    await expect(readFile(statePath, "utf8")).resolves.toContain('"status": "succeeded"');
    await expect(readFile(statePath, "utf8")).resolves.toContain("Removed remaining worktree directory.");
  });
});
