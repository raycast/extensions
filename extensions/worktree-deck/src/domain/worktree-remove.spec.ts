import { describe, expect, it } from "vitest";

import { worktreeRemoveService } from "./worktree-remove.service";

describe("normalizeRemovalBranchName", () => {
  it("空白を除去して有効なブランチ名を返す", () => {
    expect(worktreeRemoveService.normalizeBranchName(" feature/test ")).toBe("feature/test");
  });

  it("root と空文字は削除対象外として null を返す", () => {
    expect(worktreeRemoveService.normalizeBranchName("root")).toBeNull();
    expect(worktreeRemoveService.normalizeBranchName("   ")).toBeNull();
  });
});

describe("resolveRemoteBranchNameFromMergeRef", () => {
  it("refs/heads/ を除去してブランチ名を返す", () => {
    expect(
      worktreeRemoveService.resolveRemoteBranchNameFromMergeRef({
        mergeRef: "refs/heads/feature/test",
        fallbackBranch: "feature/fallback",
      }),
    ).toBe("feature/test");
  });

  it("mergeRef がない場合はフォールバック値を返す", () => {
    expect(
      worktreeRemoveService.resolveRemoteBranchNameFromMergeRef({
        mergeRef: null,
        fallbackBranch: "feature/fallback",
      }),
    ).toBe("feature/fallback");
  });
});

describe("selectRemoteNameForDeletion", () => {
  it("設定済みリモートが候補に含まれる場合はそれを優先する", () => {
    expect(
      worktreeRemoveService.selectRemoteNameForDeletion({
        remotes: ["origin", "upstream"],
        configuredRemote: "upstream",
      }),
    ).toBe("upstream");
  });

  it("設定済みリモートが無効な場合は origin を優先する", () => {
    expect(
      worktreeRemoveService.selectRemoteNameForDeletion({
        remotes: ["upstream", "origin"],
        configuredRemote: "unknown",
      }),
    ).toBe("origin");
  });

  it("候補がない場合は null を返す", () => {
    expect(
      worktreeRemoveService.selectRemoteNameForDeletion({
        remotes: [],
        configuredRemote: null,
      }),
    ).toBeNull();
  });
});
