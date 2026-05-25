import { describe, expect, it } from "vitest";

import { worktreeMergeService } from "./worktree-merge.service";

describe("resolveRemoteNameFromTargetRef", () => {
  it("リモート一覧に存在する接頭辞を返す", () => {
    const remoteName = worktreeMergeService.resolveRemoteNameFromTargetRef({
      targetRef: "origin/main",
      remotes: ["origin", "upstream"],
    });

    expect(remoteName).toBe("origin");
  });

  it("接頭辞がリモート一覧に存在しなければ null を返す", () => {
    const remoteName = worktreeMergeService.resolveRemoteNameFromTargetRef({
      targetRef: "unknown/main",
      remotes: ["origin", "upstream"],
    });

    expect(remoteName).toBeNull();
  });
});

describe("resolveTargetBranchName", () => {
  it("リモート名付き参照ならローカルブランチ名へ変換する", () => {
    const branch = worktreeMergeService.resolveTargetBranchName({
      targetRef: "origin/release/v1",
      remoteName: "origin",
    });

    expect(branch).toBe("release/v1");
  });

  it("リモート名が無ければ参照をそのまま返す", () => {
    const branch = worktreeMergeService.resolveTargetBranchName({ targetRef: "main", remoteName: null });

    expect(branch).toBe("main");
  });
});

describe("shouldCreateTrackingBranch", () => {
  it("ローカル未作成かつリモートがある場合は true を返す", () => {
    const shouldCreate = worktreeMergeService.shouldCreateTrackingBranch({
      remoteName: "origin",
      targetLocalExists: false,
    });

    expect(shouldCreate).toBe(true);
  });

  it("ローカルブランチが既にある場合は false を返す", () => {
    const shouldCreate = worktreeMergeService.shouldCreateTrackingBranch({
      remoteName: "origin",
      targetLocalExists: true,
    });

    expect(shouldCreate).toBe(false);
  });
});
