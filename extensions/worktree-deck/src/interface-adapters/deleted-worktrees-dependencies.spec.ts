import { describe, expect, it, vi } from "vitest";

import type { DeletedWorktreeEntry } from "../application/deleted-worktrees.usecase";
import { createDeletedWorktreeDependencies } from "./deleted-worktrees-dependencies";

/**
 * テスト用の削除済み worktree を作成する
 */
function buildEntry(): DeletedWorktreeEntry {
  return {
    repoRoot: "/repos/app",
    repoName: "app",
    worktreePath: "/worktrees/app~_~feature-a",
    branch: "feature/a",
    removedAt: "2026-05-14T00:00:00.000Z",
  };
}

describe("createDeletedWorktreeDependencies", () => {
  it("削除済み worktree の依存ポートを infra に接続する", async () => {
    const entry = buildEntry();
    const infra = {
      loadDeletedWorktrees: vi.fn(async () => [entry]),
      saveDeletedWorktrees: vi.fn(async () => undefined),
      saveDeletedWorktree: vi.fn(async () => undefined),
      deleteDeletedWorktree: vi.fn(async () => undefined),
      checkLocalBranchExists: vi.fn(async () => true),
    };

    const dependencies = createDeletedWorktreeDependencies(infra);

    await expect(dependencies.loadDeletedWorktrees()).resolves.toEqual([entry]);
    await dependencies.saveDeletedWorktrees([entry]);
    await dependencies.saveDeletedWorktree(entry);
    await dependencies.deleteDeletedWorktree({ repoRoot: "/repos/app", branch: "feature/a" });
    await expect(dependencies.checkLocalBranchExists({ repoRoot: "/repos/app", branch: "feature/a" })).resolves.toBe(
      true,
    );
    expect(infra.saveDeletedWorktrees).toHaveBeenCalledWith([entry]);
    expect(infra.saveDeletedWorktree).toHaveBeenCalledWith(entry);
    expect(infra.deleteDeletedWorktree).toHaveBeenCalledWith({
      repoRoot: "/repos/app",
      branch: "feature/a",
    });
    expect(infra.checkLocalBranchExists).toHaveBeenCalledWith({
      repoRoot: "/repos/app",
      branch: "feature/a",
    });
  });
});
