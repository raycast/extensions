import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRemoveWorktreeDependencies, createRemoveWorktreeInfra } from "./remove-worktree-dependencies";

describe("createRemoveWorktreeDependencies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("worktree remove コマンドを組み立てる", async () => {
    const runGit = vi.fn(async () => ({ stdout: "removed", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    const result = await dependencies.runWorktreeRemove({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      force: true,
    });

    expect(runGit).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      gitArgs: ["worktree", "remove", "--force", "/worktrees/app-a~_~feature-test"],
    });
    expect(result).toEqual({ stdout: "removed", stderr: "" });
  });

  it("削除可能性確認では main worktree を失敗にする", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.validateWorktreeRemoval({
        repoRoot: "/repos/app-a",
        worktreePath: "/repos/app-a",
      }),
    ).rejects.toThrow("Cannot remove the main working tree.");

    expect(runGit).not.toHaveBeenCalled();
  });

  it("削除可能性確認では未コミット変更を失敗にする", async () => {
    const runGit = vi.fn(async () => ({ stdout: " M src/index.ts\n", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.validateWorktreeRemoval({
        repoRoot: "/repos/app-a",
        worktreePath: "/worktrees/app-a~_~feature-test",
      }),
    ).rejects.toThrow("Working tree has modified or untracked files.");
  });

  it("force 指定の削除可能性確認では未コミット変更を許可する", async () => {
    const runGit = vi.fn(async () => ({ stdout: " M src/index.ts\n", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.validateWorktreeRemoval({
        repoRoot: "/repos/app-a",
        worktreePath: "/worktrees/app-a~_~feature-test",
        force: true,
      }),
    ).resolves.toBeUndefined();
  });

  it("削除可能性確認では locked worktree を失敗にする", async () => {
    const runGit = vi
      .fn(async () => ({ stdout: "", stderr: "" }))
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({
        stdout:
          "worktree /repos/app-a\nHEAD abc\nbranch refs/heads/main\n\nworktree /worktrees/app-a~_~feature-test\nHEAD def\nbranch refs/heads/feature/test\nlocked in use\n",
        stderr: "",
      });
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.validateWorktreeRemoval({
        repoRoot: "/repos/app-a",
        worktreePath: "/worktrees/app-a~_~feature-test",
      }),
    ).rejects.toThrow("Working tree is locked.");
  });

  it("バックグラウンド削除 job を作成して worker を起動する", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-job-"));
    const storageDir = join(tempRoot, ".worktree-deck", "storage");
    vi.stubEnv("HOME", tempRoot);
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const startWorker = vi.fn(() => undefined);
    const dependencies = createRemoveWorktreeDependencies({
      runGit,
      removeDirectory,
      startWorker,
      createId: () => "job-1",
      now: () => new Date("2026-04-28T00:00:00.000Z"),
    });

    const result = await dependencies.startBackgroundWorktreeRemove({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      branch: "feature/test",
      deleteBranch: true,
      deleteRemoteBranch: false,
    });

    expect(result).toEqual({
      jobId: "job-1",
      statePath: join(storageDir, "remove-jobs", "job-1.json"),
    });
    expect(startWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        statePath: join(storageDir, "remove-jobs", "job-1.json"),
      }),
    );
    await expect(readFile(result.statePath, "utf8")).resolves.toContain('"status": "pending"');
  });

  it("worker script が存在しない場合はバックグラウンド削除を開始しない", async () => {
    const originalWorkerPath = process.env.WORKTREE_REMOVE_WORKER_PATH;
    process.env.WORKTREE_REMOVE_WORKER_PATH = "/tmp/missing-remove-worktree-worker.js";
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });
    try {
      await expect(
        dependencies.startBackgroundWorktreeRemove({
          repoRoot: "/repos/app-a",
          worktreePath: "/worktrees/app-a~_~feature-test",
          branch: "feature/test",
          deleteBranch: false,
          deleteRemoteBranch: false,
        }),
      ).rejects.toThrow("Remove worker script was not found.");
    } finally {
      if (originalWorkerPath === undefined) {
        delete process.env.WORKTREE_REMOVE_WORKER_PATH;
      } else {
        process.env.WORKTREE_REMOVE_WORKER_PATH = originalWorkerPath;
      }
    }
  });

  it("assetsPath が指定された場合はそこから worker script を起動する", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-assets-"));
    vi.stubEnv("HOME", tempRoot);
    const assetsPath = join(tempRoot, "assets");
    const workerPath = join(assetsPath, "remove_worktree_worker.js");
    await mkdir(assetsPath);
    await writeFile(workerPath, "#!/usr/bin/env node\n", "utf8");
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const startWorker = vi.fn(() => undefined);
    const dependencies = createRemoveWorktreeDependencies({
      runGit,
      removeDirectory,
      startWorker,
      createId: () => "job-assets",
      now: () => new Date("2026-04-28T00:00:00.000Z"),
    });

    await dependencies.startBackgroundWorktreeRemove({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      assetsPath,
      branch: "feature/test",
      deleteBranch: false,
      deleteRemoteBranch: false,
    });

    expect(startWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        workerPath,
      }),
    );
  });

  it("リモート一覧取得に失敗した場合は空配列へフォールバックする", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error("failed"));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(dependencies.listRemotes({ repoRoot: "/repos/app-a" })).resolves.toEqual([]);
  });

  it("git config の値は trim して返す", async () => {
    const runGit = vi.fn(async () => ({ stdout: "  origin  \n", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    const result = await dependencies.readGitConfigValue({
      repoRoot: "/repos/app-a",
      key: "branch.feature/test.remote",
    });

    expect(runGit).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      gitArgs: ["config", "--get", "branch.feature/test.remote"],
    });
    expect(result).toBe("origin");
  });

  it("リモートブランチ存在確認は stdout の有無で判定する", async () => {
    const runGit = vi.fn(async () => ({ stdout: "abc123\trefs/heads/feature/test\n", stderr: "" }));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    const exists = await dependencies.checkRemoteBranchExists({
      repoRoot: "/repos/app-a",
      remote: "origin",
      branch: "feature/test",
    });

    expect(runGit).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      gitArgs: ["ls-remote", "--heads", "origin", "feature/test"],
    });
    expect(exists).toBe(true);
  });

  it("is not a working tree の場合もディレクトリ削除へフォールバックしない", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-"));
    const repoRoot = join(tempRoot, "repo");
    const worktreePath = join(tempRoot, "app~_~feature-x");
    const gitdirPath = join(repoRoot, ".git", "worktrees", "feature-x");
    await mkdir(gitdirPath, { recursive: true });
    await mkdir(worktreePath);
    await writeFile(join(worktreePath, ".git"), `gitdir: ${gitdirPath}\n`, "utf8");
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error(`fatal: '${worktreePath}' is not a working tree`));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot,
        worktreePath,
      }),
    ).rejects.toThrow(`fatal: '${worktreePath}' is not a working tree`);
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it("エラー内のパスが対象と一致しない場合はフォールバック削除しない", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error("fatal: '/tmp/other-path' is not a working tree"));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot: "/Users/kz/dev-flow",
        worktreePath: "/Users/kz/.dev-flow/worktrees/app~_~feature-x",
      }),
    ).rejects.toThrow("fatal: '/tmp/other-path' is not a working tree");
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it("gitdir が repo 配下でない場合も手動削除へフォールバックしない", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "remove-worktree-"));
    const repoRoot = join(tempRoot, "repo");
    const worktreePath = join(tempRoot, "app~_~feature-x");
    await mkdir(worktreePath, { recursive: true });
    await writeFile(join(worktreePath, ".git"), "gitdir: /tmp/non-existent\n", "utf8");
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error(`fatal: '${worktreePath}' is not a working tree`));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot,
        worktreePath,
      }),
    ).rejects.toThrow(`fatal: '${worktreePath}' is not a working tree`);
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it("is not a working tree 以外の削除エラーは失敗として扱う", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error("fatal: permission denied"));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot: "/Users/kz/dev-flow",
        worktreePath: "/Users/kz/.dev-flow/worktrees/app~_~feature-x",
      }),
    ).rejects.toThrow("fatal: permission denied");
  });

  it("未コミット変更がある場合は失敗を維持する", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(
      new Error(
        "fatal: '/Users/kz/.dev-flow/worktrees/app~_~feature-x' contains modified or untracked files, use --force to delete it",
      ),
    );
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot: "/Users/kz/dev-flow",
        worktreePath: "/Users/kz/.dev-flow/worktrees/app~_~feature-x",
      }),
    ).rejects.toThrow("Working tree has modified or untracked files.");
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it("git remove 後に残ったディレクトリは削除して成功扱いにする", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(
      new Error("error: failed to delete '/Users/kz/.dev-flow/worktrees/app~_~feature-x': Directory not empty"),
    );
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    const result = await dependencies.runWorktreeRemove({
      repoRoot: "/Users/kz/dev-flow",
      worktreePath: "/Users/kz/.dev-flow/worktrees/app~_~feature-x",
    });

    expect(result).toEqual({ stdout: "", stderr: "Removed remaining worktree directory." });
    expect(removeDirectory).toHaveBeenCalledWith({
      repoRoot: "/Users/kz/dev-flow",
      path: "/Users/kz/.dev-flow/worktrees/app~_~feature-x",
    });
  });

  it("worktree が lock されている場合は unlock せず英語エラーで失敗する", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit
      .mockRejectedValueOnce(new Error("fatal: cannot remove a locked working tree, lock reason: in use"))
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "removed", stderr: "" });
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot: "/repos/app-a",
        worktreePath: "/worktrees/app-a~_~feature-test",
      }),
    ).rejects.toThrow("Working tree is locked.");

    expect(runGit).toHaveBeenNthCalledWith(1, {
      repoRoot: "/repos/app-a",
      gitArgs: ["worktree", "remove", "/worktrees/app-a~_~feature-test"],
    });
    expect(runGit).toHaveBeenCalledTimes(1);
  });

  it("main working tree を削除しようとした場合は明示的なエラーを返す", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error("fatal: '/repos/app-a' is a main working tree"));
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    await expect(
      dependencies.runWorktreeRemove({
        repoRoot: "/repos/app-a",
        worktreePath: "/repos/app-a",
      }),
    ).rejects.toThrow("Cannot remove the main working tree.");
    expect(removeDirectory).not.toHaveBeenCalled();
  });

  it("stale metadata による not found 系エラーでは prune 後に再試行する", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit
      .mockRejectedValueOnce(new Error("fatal: '/worktrees/app-a~_~feature-test' does not exist"))
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "removed", stderr: "" });
    const removeDirectory = vi.fn(async () => undefined);
    const dependencies = createRemoveWorktreeDependencies({ runGit, removeDirectory });

    const result = await dependencies.runWorktreeRemove({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
    });

    expect(result).toEqual({ stdout: "removed", stderr: "" });
    expect(runGit).toHaveBeenNthCalledWith(1, {
      repoRoot: "/repos/app-a",
      gitArgs: ["worktree", "remove", "/worktrees/app-a~_~feature-test"],
    });
    expect(runGit).toHaveBeenNthCalledWith(2, {
      repoRoot: "/repos/app-a",
      gitArgs: ["worktree", "prune"],
    });
    expect(runGit).toHaveBeenNthCalledWith(3, {
      repoRoot: "/repos/app-a",
      gitArgs: ["worktree", "remove", "/worktrees/app-a~_~feature-test"],
    });
    expect(removeDirectory).not.toHaveBeenCalled();
  });
});

describe("createRemoveWorktreeInfra", () => {
  it("リポジトリ配下で git コマンドを実行する", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const infra = createRemoveWorktreeInfra({ execFileImpl: execFileMock });
    const result = await infra.runGit({ repoRoot: "/repos/app-a", gitArgs: ["status", "--short"] });

    expect(execFileMock).toHaveBeenCalledWith("git", ["-C", "/repos/app-a", "status", "--short"], {
      cwd: "/repos/app-a",
    });
    expect(result).toEqual({ stdout: "ok", stderr: "" });
  });

  it("repoRoot が .git/worktrees 配下の場合は main repo root に補正して実行する", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const infra = createRemoveWorktreeInfra({ execFileImpl: execFileMock });
    const result = await infra.runGit({
      repoRoot: "/repos/app-a/.git/worktrees/app-a_-_feature-test",
      gitArgs: ["worktree", "remove", "/worktrees/app-a~_~feature-test"],
    });

    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      ["-C", "/repos/app-a", "worktree", "remove", "/worktrees/app-a~_~feature-test"],
      {
        cwd: "/repos/app-a",
      },
    );
    expect(result).toEqual({ stdout: "ok", stderr: "" });
  });

  it("ディレクトリ削除処理を提供する", async () => {
    const infra = createRemoveWorktreeInfra();
    expect(typeof infra.removeDirectory).toBe("function");
  });
});
