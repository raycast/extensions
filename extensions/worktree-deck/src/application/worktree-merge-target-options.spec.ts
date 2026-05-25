import { describe, expect, it, vi } from "vitest";

import {
  worktreeMergeTargetOptionsUsecase,
  type WorktreeMergeTargetOptionsDependencies,
} from "./worktree-merge-target-options.usecase";

/**
 * merge target 選択ユースケース向け依存モックを作る
 */
function buildDependencies(): WorktreeMergeTargetOptionsDependencies {
  return {
    listMergeTargetRefs: vi.fn(async () => []),
    resolveMergeTargetRef: vi.fn(async () => null),
    loadBaseRefForBranchConfig: vi.fn(async () => null),
    loadBaseRefForWorktreePath: vi.fn(async () => null),
    saveBaseRefForBranchConfig: vi.fn(async () => undefined),
    saveBaseRefForWorktreePath: vi.fn(async () => undefined),
  };
}

describe("loadMergeTargetSelection", () => {
  it("branch config の保存値を候補へ追加し、初期選択に使う", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadBaseRefForBranchConfig).mockResolvedValueOnce("release");
    vi.mocked(dependencies.listMergeTargetRefs).mockResolvedValueOnce(["origin/main", "develop"]);
    vi.mocked(dependencies.resolveMergeTargetRef).mockResolvedValueOnce("origin/main");

    await expect(
      worktreeMergeTargetOptionsUsecase.loadMergeTargetSelection({
        worktreePath: "/repo/wt",
        branch: "feature/a",
        dependencies,
      }),
    ).resolves.toEqual({
      refs: ["develop", "origin/main", "release"],
      selectedRef: "release",
      storedBaseRef: "release",
    });
  });

  it("候補も保存値もない場合は現状と同じエラーにする", async () => {
    const dependencies = buildDependencies();

    await expect(
      worktreeMergeTargetOptionsUsecase.loadMergeTargetSelection({
        worktreePath: "/repo/wt",
        branch: "feature/a",
        dependencies,
      }),
    ).rejects.toThrow("No merge targets found.");
  });
});

describe("loadPullRequestBaseSelection", () => {
  it("保存済み base ref が候補に含まれる場合だけ初期選択に使う", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.listMergeTargetRefs).mockResolvedValueOnce(["origin/main", "develop"]);
    vi.mocked(dependencies.resolveMergeTargetRef).mockResolvedValueOnce("origin/main");
    vi.mocked(dependencies.loadBaseRefForBranchConfig).mockResolvedValueOnce("develop");
    vi.mocked(dependencies.loadBaseRefForWorktreePath).mockResolvedValueOnce("release");

    await expect(
      worktreeMergeTargetOptionsUsecase.loadPullRequestBaseSelection({
        worktreePath: "/repo/wt",
        sourceBranch: "feature/a",
        dependencies,
      }),
    ).resolves.toEqual({
      refs: ["develop", "origin/main"],
      selectedRef: "develop",
      storedBaseRef: "develop",
    });
  });

  it("PR base では保存値を候補へ追加せず、候補外なら default を選ぶ", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.listMergeTargetRefs).mockResolvedValueOnce(["develop"]);
    vi.mocked(dependencies.resolveMergeTargetRef).mockResolvedValueOnce("origin/main");
    vi.mocked(dependencies.loadBaseRefForBranchConfig).mockResolvedValueOnce("release");

    await expect(
      worktreeMergeTargetOptionsUsecase.loadPullRequestBaseSelection({
        worktreePath: "/repo/wt",
        sourceBranch: "feature/a",
        dependencies,
      }),
    ).resolves.toEqual({
      refs: ["develop", "origin/main"],
      selectedRef: "origin/main",
      storedBaseRef: "release",
    });
  });
});

describe("saveBaseSelection", () => {
  it("branch 指定時は branch config と worktree storage の両方へ保存する", async () => {
    const dependencies = buildDependencies();

    await worktreeMergeTargetOptionsUsecase.saveBaseSelection({
      worktreePath: " /repo/wt ",
      branch: " feature/a ",
      baseRef: " origin/main ",
      dependencies,
    });

    expect(dependencies.saveBaseRefForBranchConfig).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      branch: "feature/a",
      baseRef: "origin/main",
    });
    expect(dependencies.saveBaseRefForWorktreePath).toHaveBeenCalledWith("/repo/wt", "origin/main");
  });
});
