import { describe, expect, it, vi } from "vitest";

import {
  worktreePullRequestUsecase,
  type BuildWorktreePullRequestPlanDependencies,
  type ResolvePullRequestHeadBranchDependencies,
} from "./worktree-pull-request.usecase";

/**
 * ヘッドブランチ解決ユースケースの依存モックを作成する
 */
function buildResolveDependencies(): ResolvePullRequestHeadBranchDependencies {
  return {
    readCurrentBranch: vi.fn(async () => "feature/add-login"),
  };
}

/**
 * PR 計画作成ユースケースの依存モックを作成する
 */
function buildPlanDependencies(): BuildWorktreePullRequestPlanDependencies {
  return {
    resolveHeadBranch: vi.fn(async () => "feature/add-login"),
    resolveMergeTargetRef: vi.fn(async () => "origin/main"),
    listRemotes: vi.fn(async () => ["origin", "upstream"]),
    checkLocalBranchExists: vi.fn(async () => true),
  };
}

describe("resolvePullRequestHeadBranch", () => {
  it("headBranch 指定が無い場合は現在ブランチを返す", async () => {
    const dependencies = buildResolveDependencies();

    const headBranch = await worktreePullRequestUsecase.resolveHeadBranch({
      worktreePath: "/repo/worktree",
      dependencies,
    });

    expect(headBranch).toBe("feature/add-login");
    expect(dependencies.readCurrentBranch).toHaveBeenCalledWith("/repo/worktree");
  });

  it("headBranch が root の場合は現在ブランチへフォールバックする", async () => {
    const dependencies = buildResolveDependencies();

    const headBranch = await worktreePullRequestUsecase.resolveHeadBranch({
      worktreePath: "/repo/worktree",
      headBranch: "root",
      dependencies,
    });

    expect(headBranch).toBe("feature/add-login");
    expect(dependencies.readCurrentBranch).toHaveBeenCalledWith("/repo/worktree");
  });
});

describe("buildWorktreePullRequestPlan", () => {
  it("baseRef 未指定時は推定値を使って PR 計画を作る", async () => {
    const dependencies = buildPlanDependencies();

    const plan = await worktreePullRequestUsecase.buildPlan({
      repoRoot: " /repo/root ",
      worktreePath: " /repo/worktree ",
      title: " Add login flow ",
      description: " description ",
      draft: true,
      dependencies,
    });

    expect(plan).toEqual({
      repoRoot: "/repo/root",
      worktreePath: "/repo/worktree",
      baseRef: "origin/main",
      baseBranch: "main",
      headBranch: "feature/add-login",
      remoteName: "origin",
      title: "Add login flow",
      description: "description",
      draft: true,
    });
  });

  it("head と base が同じ場合はエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.resolveHeadBranch).mockResolvedValueOnce("main");

    await expect(
      worktreePullRequestUsecase.buildPlan({
        repoRoot: "/repo/root",
        worktreePath: "/repo/worktree",
        baseRef: "main",
        title: "Add login flow",
        draft: false,
        dependencies,
      }),
    ).rejects.toThrow("Base branch must be different from head branch.");
  });

  it("head ブランチがローカルに存在しない場合はエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValueOnce(false);

    await expect(
      worktreePullRequestUsecase.buildPlan({
        repoRoot: "/repo/root",
        worktreePath: "/repo/worktree",
        baseRef: "origin/main",
        headBranch: "feature/add-login",
        title: "Add login flow",
        draft: false,
        dependencies,
      }),
    ).rejects.toThrow('Head branch "feature/add-login" does not exist in repository.');
  });
});
