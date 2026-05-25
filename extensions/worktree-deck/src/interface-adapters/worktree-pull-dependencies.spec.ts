import { describe, expect, it, vi } from "vitest";

import { createBuildWorktreePullPlanDependencies, createPullWorktreeDependencies } from "./worktree-pull-dependencies";

describe("createBuildWorktreePullPlanDependencies", () => {
  it("計画作成の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "feature/a"),
      readUpstreamTrackingRef: vi.fn(async () => "origin/feature/a"),
      pullFromUpstream: vi.fn(async () => undefined),
    };
    const dependencies = createBuildWorktreePullPlanDependencies(infra);

    const [branch, upstreamRef] = await Promise.all([
      dependencies.readCurrentBranch("/repo/worktree"),
      dependencies.readUpstreamTrackingRef("/repo/worktree"),
    ]);

    expect(branch).toBe("feature/a");
    expect(upstreamRef).toBe("origin/feature/a");
  });
});

describe("createPullWorktreeDependencies", () => {
  it("pull 実行の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "feature/a"),
      readUpstreamTrackingRef: vi.fn(async () => "origin/feature/a"),
      pullFromUpstream: vi.fn(async () => undefined),
    };
    const dependencies = createPullWorktreeDependencies(infra);

    await dependencies.pullFromUpstream("/repo/worktree");

    expect(infra.pullFromUpstream).toHaveBeenCalledWith("/repo/worktree");
  });
});
