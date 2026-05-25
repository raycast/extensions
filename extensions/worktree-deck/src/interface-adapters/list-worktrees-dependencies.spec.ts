import { describe, expect, it, vi } from "vitest";

import type { WorktreeDeckContext } from "../application/list-worktrees.usecase";
import { createListWorktreesDependencies } from "./list-worktrees-dependencies";

/**
 * テスト用の実行コンテキストを作成する
 */
function buildContext(): WorktreeDeckContext {
  return {
    env: {},
    cwd: "/tmp/dev-flow",
    homeDir: "/Users/tester",
    assetsPath: "/tmp/dev-flow/assets",
    packageDir: "/tmp/dev-flow",
    packageName: "worktree-deck",
  };
}

describe("createListWorktreesDependencies", () => {
  it("設定読み込みで basePath を組み立てる", async () => {
    const context = buildContext();
    const dependencies = createListWorktreesDependencies({
      loadBasePath: vi.fn(async () => "/tmp/worktrees"),
      loadRepositoryMappings: vi.fn(async () => []),
      loadCachedWorktreesBase: vi.fn(async () => null),
      loadWorktreesBase: vi.fn(async () => []),
    });

    const result = await dependencies.loadSettings(context);

    expect(result).toEqual({ basePath: "/tmp/worktrees" });
  });

  it("mapping 読み込み失敗時は空配列を返す", async () => {
    const dependencies = createListWorktreesDependencies({
      loadBasePath: vi.fn(async () => "/tmp/worktrees"),
      loadRepositoryMappings: vi.fn(async () => {
        throw new Error("failed");
      }),
      loadCachedWorktreesBase: vi.fn(async () => null),
      loadWorktreesBase: vi.fn(async () => []),
    });

    await expect(dependencies.loadMappings()).resolves.toEqual([]);
  });

  it("worktree 一覧読み込みを infra に委譲する", async () => {
    const loadWorktreesBase = vi.fn(async () => [
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
      },
    ]);
    const dependencies = createListWorktreesDependencies({
      loadBasePath: vi.fn(async () => "/tmp/worktrees"),
      loadRepositoryMappings: vi.fn(async () => []),
      loadCachedWorktreesBase: vi.fn(async () => null),
      loadWorktreesBase,
    });

    const result = await dependencies.loadWorktrees("/tmp/worktrees");

    expect(loadWorktreesBase).toHaveBeenCalledWith("/tmp/worktrees");
    expect(result).toEqual([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
      },
    ]);
  });

  it("worktree cache 読み込みを infra に委譲する", async () => {
    const loadCachedWorktreesBase = vi.fn(async () => [
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
      },
    ]);
    const dependencies = createListWorktreesDependencies({
      loadBasePath: vi.fn(async () => "/tmp/worktrees"),
      loadRepositoryMappings: vi.fn(async () => []),
      loadCachedWorktreesBase,
      loadWorktreesBase: vi.fn(async () => []),
    });

    const result = await dependencies.loadCachedWorktrees("/tmp/worktrees");

    expect(loadCachedWorktreesBase).toHaveBeenCalledWith("/tmp/worktrees");
    expect(result).toEqual([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
      },
    ]);
  });
});
