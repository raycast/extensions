import { describe, expect, it } from "vitest";

import { worktreePullService } from "./worktree-pull.service";

describe("matchesExpectedPullBranch", () => {
  it("期待ブランチ未指定なら一致とみなす", () => {
    expect(worktreePullService.matchesExpectedBranch({ expectedBranch: null, currentBranch: "feature/a" })).toBe(true);
  });

  it("前後空白を除去して一致判定する", () => {
    expect(
      worktreePullService.matchesExpectedBranch({ expectedBranch: " feature/a ", currentBranch: "feature/a" }),
    ).toBe(true);
  });

  it("期待ブランチと異なる場合は不一致になる", () => {
    expect(worktreePullService.matchesExpectedBranch({ expectedBranch: "main", currentBranch: "feature/a" })).toBe(
      false,
    );
  });
});

describe("normalizePullUpstreamRef", () => {
  it("前後空白を除去して upstream 参照を返す", () => {
    expect(worktreePullService.normalizeUpstreamRef(" origin/feature/a ")).toBe("origin/feature/a");
  });

  it("空文字は null に正規化する", () => {
    expect(worktreePullService.normalizeUpstreamRef("   ")).toBeNull();
  });
});
