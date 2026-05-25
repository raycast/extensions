import { describe, expect, it, vi } from "vitest";

import {
  worktreeRenameUsecase,
  type RenameWorktreeBranchDependencies,
  type RenameWorktreeBranchInput,
} from "./worktree-rename.usecase";

/**
 * テスト用の依存ポートを作成する
 */
function buildDependencies(): RenameWorktreeBranchDependencies {
  return {
    renameLocalBranch: vi.fn(async () => undefined),
    listRemotes: vi.fn(async () => ["origin"]),
    readGitConfigValue: vi.fn(async () => "origin"),
    checkRemoteBranchExists: vi.fn(async () => true),
    pushRemoteBranch: vi.fn(async () => undefined),
    deleteRemoteBranch: vi.fn(async () => undefined),
  };
}

/**
 * テスト用の入力を作成する
 */
function buildInput(overrides?: Partial<RenameWorktreeBranchInput>): RenameWorktreeBranchInput {
  return {
    repoRoot: "/repos/app-a",
    oldBranch: "feature/old-name",
    newBranch: "feature/new-name",
    renameRemoteBranch: false,
    ...overrides,
  };
}

describe("rename", () => {
  it("リモート変更が無効ならローカル名変更のみ実行する", async () => {
    const dependencies = buildDependencies();

    const result = await worktreeRenameUsecase.rename({
      input: buildInput({ renameRemoteBranch: false }),
      dependencies,
    });

    expect(dependencies.renameLocalBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      oldBranch: "feature/old-name",
      newBranch: "feature/new-name",
    });
    expect(dependencies.listRemotes).not.toHaveBeenCalled();
    expect(dependencies.pushRemoteBranch).not.toHaveBeenCalled();
    expect(dependencies.deleteRemoteBranch).not.toHaveBeenCalled();
    expect(result).toEqual({
      oldBranch: "feature/old-name",
      newBranch: "feature/new-name",
      renamedRemoteBranch: false,
      remoteName: null,
    });
  });

  it("リモート変更が有効なら新ブランチを push して旧ブランチを削除する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.readGitConfigValue).mockResolvedValueOnce("origin");
    vi.mocked(dependencies.checkRemoteBranchExists).mockResolvedValueOnce(true);

    const result = await worktreeRenameUsecase.rename({
      input: buildInput({ renameRemoteBranch: true }),
      dependencies,
    });

    expect(dependencies.readGitConfigValue).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      key: "branch.feature/old-name.remote",
    });
    expect(dependencies.pushRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      remote: "origin",
      branch: "feature/new-name",
      setUpstream: true,
    });
    expect(dependencies.deleteRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      remote: "origin",
      branch: "feature/old-name",
    });
    expect(result).toEqual({
      oldBranch: "feature/old-name",
      newBranch: "feature/new-name",
      renamedRemoteBranch: true,
      remoteName: "origin",
    });
  });

  it("追跡リモートが origin 以外でも設定済みリモートを優先する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.listRemotes).mockResolvedValueOnce(["origin", "upstream"]);
    vi.mocked(dependencies.readGitConfigValue).mockResolvedValueOnce("upstream");
    vi.mocked(dependencies.checkRemoteBranchExists).mockResolvedValueOnce(true);

    const result = await worktreeRenameUsecase.rename({
      input: buildInput({ renameRemoteBranch: true }),
      dependencies,
    });

    expect(dependencies.pushRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      remote: "upstream",
      branch: "feature/new-name",
      setUpstream: true,
    });
    expect(dependencies.deleteRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      remote: "upstream",
      branch: "feature/old-name",
    });
    expect(result.remoteName).toBe("upstream");
  });
});
