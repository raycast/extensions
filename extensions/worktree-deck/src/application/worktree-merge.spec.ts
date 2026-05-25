import { describe, expect, it, vi } from "vitest";

import {
  worktreeMergeUsecase,
  type BuildWorktreeMergePlanDependencies,
  type MergeWorktreeIntoBaseDependencies,
  type WorktreeMergePlan,
} from "./worktree-merge.usecase";

/**
 * 計画作成ユースケース向け依存ポートのモックを作る
 */
function buildPlanDependencies(): BuildWorktreeMergePlanDependencies {
  return {
    readCurrentBranch: vi.fn(async () => "feature/add-login"),
    resolveMergeTargetRef: vi.fn(async () => "origin/main"),
    listRemotes: vi.fn(async () => ["origin", "upstream"]),
    checkLocalBranchExists: vi.fn(async (_repoRoot, branch) => branch !== "main"),
  };
}

/**
 * マージ実行ユースケース向け依存ポートのモックを作る
 */
function buildMergeDependencies(): MergeWorktreeIntoBaseDependencies {
  return {
    checkWorktreeClean: vi.fn(async () => true),
    checkLocalBranchExists: vi.fn(async () => true),
    readCurrentBranch: vi.fn(async () => "develop"),
    createTrackingBranch: vi.fn(async () => undefined),
    switchBranch: vi.fn(async () => undefined),
    mergeBranch: vi.fn(async () => undefined),
  };
}

describe("buildPlan", () => {
  it("targetRef 未指定時は推定値で計画を作る", async () => {
    const dependencies = buildPlanDependencies();

    const plan = await worktreeMergeUsecase.buildPlan({
      repoRoot: " /repo/root ",
      worktreePath: " /repo/worktree ",
      dependencies,
    });

    expect(plan).toEqual({
      repoRoot: "/repo/root",
      worktreePath: "/repo/worktree",
      sourceBranch: "feature/add-login",
      targetRef: "origin/main",
      targetBranch: "main",
      needsTrackingBranch: true,
    });
  });

  it("ソースとターゲットが同じならエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.readCurrentBranch).mockResolvedValueOnce("main");
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValue(true);

    await expect(
      worktreeMergeUsecase.buildPlan({
        repoRoot: "/repo/root",
        worktreePath: "/repo/worktree",
        targetRef: "main",
        dependencies,
      }),
    ).rejects.toThrow("Source branch is already the target branch.");
  });

  it("ローカルにも追跡元にもターゲットが無い場合はエラー", async () => {
    const dependencies = buildPlanDependencies();
    vi.mocked(dependencies.listRemotes).mockResolvedValueOnce(["origin"]);
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      worktreeMergeUsecase.buildPlan({
        repoRoot: "/repo/root",
        worktreePath: "/repo/worktree",
        targetRef: "main",
        dependencies,
      }),
    ).rejects.toThrow('Target branch "main" does not exist locally.');
  });
});

describe("mergeIntoBase", () => {
  const basePlan: WorktreeMergePlan = {
    repoRoot: "/repo/root",
    worktreePath: "/repo/worktree",
    sourceBranch: "feature/add-login",
    targetRef: "origin/main",
    targetBranch: "main",
    needsTrackingBranch: true,
  };

  it("ローカルターゲットが無い場合は追跡ブランチを作る", async () => {
    const dependencies = buildMergeDependencies();
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValueOnce(false);

    const result = await worktreeMergeUsecase.mergeIntoBase({ plan: basePlan, dependencies });

    expect(dependencies.createTrackingBranch).toHaveBeenCalledWith("/repo/root", "main", "origin/main");
    expect(dependencies.switchBranch).toHaveBeenCalledWith("/repo/root", "develop");
    expect(dependencies.mergeBranch).toHaveBeenCalledWith("/repo/root", "feature/add-login");
    expect(result).toEqual({
      sourceBranch: "feature/add-login",
      targetBranch: "main",
      createdTargetBranch: true,
    });
  });

  it("ワークツリーが dirty の場合はエラー", async () => {
    const dependencies = buildMergeDependencies();
    vi.mocked(dependencies.checkWorktreeClean).mockResolvedValueOnce(false);

    await expect(worktreeMergeUsecase.mergeIntoBase({ plan: basePlan, dependencies })).rejects.toThrow(
      "Worktree has uncommitted changes.",
    );
    expect(dependencies.mergeBranch).not.toHaveBeenCalled();
  });

  it("既存ターゲットに切り替えてマージする", async () => {
    const dependencies = buildMergeDependencies();
    vi.mocked(dependencies.checkLocalBranchExists).mockResolvedValueOnce(true);

    const result = await worktreeMergeUsecase.mergeIntoBase({ plan: basePlan, dependencies });

    expect(dependencies.switchBranch).toHaveBeenNthCalledWith(1, "/repo/root", "main");
    expect(dependencies.mergeBranch).toHaveBeenCalledWith("/repo/root", "feature/add-login");
    expect(result.createdTargetBranch).toBe(false);
  });
});
