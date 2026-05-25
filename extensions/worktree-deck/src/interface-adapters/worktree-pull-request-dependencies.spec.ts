import { describe, expect, it, vi } from "vitest";

import {
  createBuildWorktreePullRequestPlanDependencies,
  createResolvePullRequestHeadBranchDependencies,
} from "./worktree-pull-request-dependencies";

describe("createResolvePullRequestHeadBranchDependencies", () => {
  it("ヘッド解決の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "feature/add-login"),
      resolveMergeTargetRef: vi.fn(async () => "origin/main"),
      listRemotes: vi.fn(async () => ["origin"]),
      checkLocalBranchExists: vi.fn(async () => true),
    };
    const dependencies = createResolvePullRequestHeadBranchDependencies(infra);

    const head = await dependencies.readCurrentBranch("/repo/worktree");

    expect(head).toBe("feature/add-login");
    expect(infra.readCurrentBranch).toHaveBeenCalledWith("/repo/worktree");
  });
});

describe("createBuildWorktreePullRequestPlanDependencies", () => {
  it("計画作成の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "feature/add-login"),
      resolveMergeTargetRef: vi.fn(async () => "origin/main"),
      listRemotes: vi.fn(async () => ["origin"]),
      checkLocalBranchExists: vi.fn(async () => true),
    };
    const dependencies = createBuildWorktreePullRequestPlanDependencies(infra);

    const [targetRef, remotes, exists] = await Promise.all([
      dependencies.resolveMergeTargetRef("/repo/worktree"),
      dependencies.listRemotes("/repo/root"),
      dependencies.checkLocalBranchExists("/repo/root", "feature/add-login"),
    ]);

    expect(targetRef).toBe("origin/main");
    expect(remotes).toEqual(["origin"]);
    expect(exists).toBe(true);
  });
});
