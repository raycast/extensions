import { describe, expect, it } from "vitest";

import { worktreePullRequestService } from "./worktree-pull-request.service";

describe("normalizePullRequestHeadBranch", () => {
  it("head branch が root の場合は null を返す", () => {
    const normalized = worktreePullRequestService.normalizeHeadBranch("root");

    expect(normalized).toBeNull();
  });

  it("head branch の前後空白を除去して返す", () => {
    const normalized = worktreePullRequestService.normalizeHeadBranch("  feature/add-login  ");

    expect(normalized).toBe("feature/add-login");
  });
});

describe("resolveRemoteNameFromBaseRef", () => {
  it("baseRef の接頭辞がリモート一覧に存在する場合はその値を返す", () => {
    const remoteName = worktreePullRequestService.resolveRemoteNameFromBaseRef({
      baseRef: "origin/main",
      remotes: ["origin", "upstream"],
    });

    expect(remoteName).toBe("origin");
  });

  it("baseRef がローカルブランチ形式の場合は null を返す", () => {
    const remoteName = worktreePullRequestService.resolveRemoteNameFromBaseRef({
      baseRef: "main",
      remotes: ["origin", "upstream"],
    });

    expect(remoteName).toBeNull();
  });
});

describe("resolveBaseBranchName", () => {
  it("リモート参照からベースブランチ名を抽出する", () => {
    const branch = worktreePullRequestService.resolveBaseBranchName({
      baseRef: "origin/release/v1",
      remoteName: "origin",
    });

    expect(branch).toBe("release/v1");
  });

  it("remoteName が無い場合は baseRef をそのまま返す", () => {
    const branch = worktreePullRequestService.resolveBaseBranchName({
      baseRef: "main",
      remoteName: null,
    });

    expect(branch).toBe("main");
  });
});
