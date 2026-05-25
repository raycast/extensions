import { describe, expect, it, vi } from "vitest";

import {
  removeWorktreeUsecase,
  type RemoveWorktreeDependencies,
  type RemoveWorktreeInput,
  type RemoveWorktreeResult,
} from "./remove-worktree.usecase";

/**
 * テスト用の依存ポートを作成する
 */
function buildDependencies(): RemoveWorktreeDependencies {
  return {
    validateWorktreeRemoval: vi.fn(async () => undefined),
    startBackgroundWorktreeRemove: vi.fn(async () => ({
      jobId: "job-1",
      statePath: "/storage/remove-jobs/job-1.json",
    })),
    runWorktreeRemove: vi.fn(async () => ({ stdout: "removed", stderr: "" })),
    checkLocalBranchExists: vi.fn(async () => false),
    deleteLocalBranch: vi.fn(async () => undefined),
    listRemotes: vi.fn(async () => []),
    readGitConfigValue: vi.fn(async () => null),
    checkRemoteBranchExists: vi.fn(async () => false),
    deleteRemoteBranch: vi.fn(async () => undefined),
  };
}

/**
 * テスト用入力を作成する
 */
function buildInput(overrides?: Partial<RemoveWorktreeInput>): RemoveWorktreeInput {
  return {
    repoRoot: "/repos/app-a",
    worktreePath: "/worktrees/app-a~_~feature-test",
    branch: "feature/test",
    deleteBranch: false,
    deleteRemoteBranch: false,
    ...overrides,
  };
}

describe("remove", () => {
  it("worktree 削除の結果をそのまま返す", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.runWorktreeRemove).mockResolvedValueOnce({ stdout: "ok", stderr: "warn" });

    const result = await removeWorktreeUsecase.remove({
      input: buildInput(),
      dependencies,
    });

    expect(result).toEqual<RemoveWorktreeResult>({ stdout: "ok", stderr: "warn" });
    expect(dependencies.runWorktreeRemove).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      force: undefined,
    });
  });

  it("ローカルブランチ削除が指定され存在する場合に削除する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValueOnce(true);

    await removeWorktreeUsecase.remove({
      input: buildInput({ deleteBranch: true }),
      dependencies,
    });

    expect(dependencies.checkLocalBranchExists).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      branch: "feature/test",
    });
    expect(dependencies.deleteLocalBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      branch: "feature/test",
    });
  });

  it("リモートブランチ削除が指定され対象が存在する場合に削除する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.listRemotes).mockResolvedValueOnce(["upstream", "origin"]);
    vi.mocked(dependencies.readGitConfigValue)
      .mockResolvedValueOnce("origin")
      .mockResolvedValueOnce("refs/heads/feature/test");
    vi.mocked(dependencies.checkRemoteBranchExists).mockResolvedValueOnce(true);

    await removeWorktreeUsecase.remove({
      input: buildInput({ deleteRemoteBranch: true }),
      dependencies,
    });

    expect(dependencies.readGitConfigValue).toHaveBeenNthCalledWith(1, {
      repoRoot: "/repos/app-a",
      key: "branch.feature/test.remote",
    });
    expect(dependencies.readGitConfigValue).toHaveBeenNthCalledWith(2, {
      repoRoot: "/repos/app-a",
      key: "branch.feature/test.merge",
    });
    expect(dependencies.deleteRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      remote: "origin",
      branch: "feature/test",
    });
  });

  it("branch が root の場合はブランチ削除を実行しない", async () => {
    const dependencies = buildDependencies();

    await removeWorktreeUsecase.remove({
      input: buildInput({
        branch: "root",
        deleteBranch: true,
        deleteRemoteBranch: true,
      }),
      dependencies,
    });

    expect(dependencies.checkLocalBranchExists).not.toHaveBeenCalled();
    expect(dependencies.deleteLocalBranch).not.toHaveBeenCalled();
    expect(dependencies.listRemotes).not.toHaveBeenCalled();
    expect(dependencies.deleteRemoteBranch).not.toHaveBeenCalled();
  });
});

describe("startBackgroundRemove", () => {
  it("削除可能性を確認してからバックグラウンド削除を開始する", async () => {
    const dependencies = buildDependencies();

    const result = await removeWorktreeUsecase.startBackgroundRemove({
      input: buildInput({ assetsPath: "/raycast/assets", force: true }),
      dependencies,
    });

    expect(result).toEqual({
      jobId: "job-1",
      statePath: "/storage/remove-jobs/job-1.json",
    });
    expect(dependencies.validateWorktreeRemoval).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      force: true,
    });
    expect(dependencies.startBackgroundWorktreeRemove).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      assetsPath: "/raycast/assets",
      force: true,
      branch: "feature/test",
      deleteBranch: false,
      deleteRemoteBranch: false,
    });
  });

  it("削除可能性確認に失敗した場合はバックグラウンド削除を開始しない", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.validateWorktreeRemoval).mockRejectedValueOnce(new Error("Working tree is locked."));

    await expect(
      removeWorktreeUsecase.startBackgroundRemove({
        input: buildInput(),
        dependencies,
      }),
    ).rejects.toThrow("Working tree is locked.");

    expect(dependencies.startBackgroundWorktreeRemove).not.toHaveBeenCalled();
  });

  it("root ブランチの場合はブランチ削除指定を worker に渡さない", async () => {
    const dependencies = buildDependencies();

    await removeWorktreeUsecase.startBackgroundRemove({
      input: buildInput({
        branch: "root",
        deleteBranch: true,
        deleteRemoteBranch: true,
      }),
      dependencies,
    });

    expect(dependencies.startBackgroundWorktreeRemove).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      worktreePath: "/worktrees/app-a~_~feature-test",
      force: undefined,
      branch: null,
      deleteBranch: false,
      deleteRemoteBranch: false,
    });
  });
});
