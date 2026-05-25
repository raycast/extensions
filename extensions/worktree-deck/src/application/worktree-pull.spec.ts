import { describe, expect, it, vi } from "vitest";

import {
  worktreePullUsecase,
  type BuildWorktreePullPlanDependencies,
  type PullWorktreeDependencies,
  type WorktreePullPlan,
} from "./worktree-pull.usecase";

/**
 * pull 計画作成ユースケース向け依存ポートのモックを作る
 */
function buildPlanDependencies(): BuildWorktreePullPlanDependencies {
  return {
    readCurrentBranch: vi.fn(async () => "feature/a"),
    readUpstreamTrackingRef: vi.fn(async () => "origin/feature/a"),
  };
}

/**
 * pull 実行ユースケース向け依存ポートのモックを作る
 */
function buildPullDependencies(): PullWorktreeDependencies {
  return {
    pullFromUpstream: vi.fn(async () => undefined),
  };
}

describe("buildPlan", () => {
  it("作業ツリーパスが空ならエラー", async () => {
    const dependencies = buildPlanDependencies();

    await expect(
      worktreePullUsecase.buildPlan({
        worktreePath: "   ",
        dependencies,
      }),
    ).rejects.toThrow("Worktree path is required.");
  });

  it("現在ブランチが取得できない場合はエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.readCurrentBranch).mockResolvedValueOnce(null);

    await expect(
      worktreePullUsecase.buildPlan({
        worktreePath: "/repo/worktree",
        dependencies,
      }),
    ).rejects.toThrow("Current branch is not available.");
  });

  it("期待ブランチと現在ブランチが異なる場合はエラー", async () => {
    const dependencies = buildPlanDependencies();

    await expect(
      worktreePullUsecase.buildPlan({
        worktreePath: "/repo/worktree",
        expectedBranch: "main",
        dependencies,
      }),
    ).rejects.toThrow("Current branch does not match selected branch.");
  });

  it("追跡ブランチが無い場合はエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.readUpstreamTrackingRef).mockResolvedValueOnce(null);

    await expect(
      worktreePullUsecase.buildPlan({
        worktreePath: "/repo/worktree",
        expectedBranch: "feature/a",
        dependencies,
      }),
    ).rejects.toThrow("Upstream branch is not configured.");
  });

  it("現在ブランチと追跡参照を含む計画を返す", async () => {
    const dependencies = buildPlanDependencies();

    const result = await worktreePullUsecase.buildPlan({
      worktreePath: " /repo/worktree ",
      expectedBranch: "feature/a",
      dependencies,
    });

    expect(result).toEqual({
      worktreePath: "/repo/worktree",
      branch: "feature/a",
      upstreamRef: "origin/feature/a",
    });
  });
});

describe("pull", () => {
  it("作業ツリーパスが空ならエラー", async () => {
    const dependencies = buildPullDependencies();

    await expect(
      worktreePullUsecase.pull({
        plan: { worktreePath: "   ", branch: "feature/a", upstreamRef: "origin/feature/a" },
        dependencies,
      }),
    ).rejects.toThrow("Worktree path is required.");
  });

  it("pull を実行して計画由来の結果を返す", async () => {
    const dependencies = buildPullDependencies();
    const plan: WorktreePullPlan = {
      worktreePath: "/repo/worktree",
      branch: "feature/a",
      upstreamRef: "origin/feature/a",
    };

    const result = await worktreePullUsecase.pull({ plan, dependencies });

    expect(dependencies.pullFromUpstream).toHaveBeenCalledWith("/repo/worktree");
    expect(result).toEqual({ branch: "feature/a", upstreamRef: "origin/feature/a" });
  });
});
