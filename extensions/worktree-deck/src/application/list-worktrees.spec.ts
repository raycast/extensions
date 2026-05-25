import { describe, expect, it, vi } from "vitest";

import {
  listWorktreesUsecase,
  type ListWorktreesDependencies,
  type WorktreeDeckContext,
  type WorktreeDeckSettings,
} from "./list-worktrees.usecase";

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

/**
 * テスト用依存ポートを作成する
 */
function buildDependencies(args?: { settings?: WorktreeDeckSettings }): ListWorktreesDependencies {
  return {
    loadSettings: vi.fn(async () => args?.settings ?? { basePath: "/tmp/worktrees" }),
    loadMappings: vi.fn(async () => []),
    loadCachedWorktrees: vi.fn(async () => null),
    loadWorktrees: vi.fn(async () => []),
  };
}

describe("list", () => {
  it("設定と依存ポートを使って一覧取得結果を構築する", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadMappings).mockResolvedValueOnce([
      { repoRoot: "/repos/app-a", mapValue: "app-a" },
      { repoRoot: "/repos/app-b", mapValue: "app-b" },
    ]);
    vi.mocked(dependencies.loadWorktrees).mockResolvedValueOnce([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
      },
      {
        repo: "app-z",
        branch: "feature/z",
        path: "/tmp/worktrees/app-z~_~feature-z",
        originPath: "/repos/app-z",
      },
    ]);

    const result = await listWorktreesUsecase.list({ context, dependencies });

    expect(result.basePath).toBe("/tmp/worktrees");
    expect(result.mappings).toEqual([
      { repoRoot: "/repos/app-a", mapValue: "app-a" },
      { repoRoot: "/repos/app-b", mapValue: "app-b" },
    ]);
    expect(result.worktrees).toEqual([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
      },
    ]);
    expect(dependencies.loadWorktrees).toHaveBeenCalledWith("/tmp/worktrees");
    expect(result.isCacheHit).toBe(false);
  });

  it("mapping が空のときは空の一覧を返す", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadMappings).mockResolvedValueOnce([]);
    vi.mocked(dependencies.loadWorktrees).mockResolvedValueOnce([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
      },
    ]);

    const result = await listWorktreesUsecase.list({ context, dependencies });

    expect(result.worktrees).toEqual([]);
  });

  it("originPath がない要素は path で mapping 判定する", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadMappings).mockResolvedValueOnce([{ repoRoot: "~/dev/app-a", mapValue: "app-a" }]);
    vi.mocked(dependencies.loadWorktrees).mockResolvedValueOnce([
      {
        repo: "app-a",
        branch: "root",
        path: "/Users/tester/dev/app-a",
      },
      {
        repo: "app-b",
        branch: "root",
        path: "/Users/tester/dev/app-b",
      },
    ]);

    const result = await listWorktreesUsecase.list({ context, dependencies });

    expect(result.worktrees).toEqual([
      {
        repo: "app-a",
        branch: "root",
        path: "/Users/tester/dev/app-a",
      },
    ]);
  });

  it("cache 優先時は保存済み worktree 一覧を使い fresh scan を避ける", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadMappings).mockResolvedValueOnce([{ repoRoot: "/repos/app-a", mapValue: "app-a" }]);
    vi.mocked(dependencies.loadCachedWorktrees).mockResolvedValueOnce([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
      },
    ]);

    const result = await listWorktreesUsecase.list({ context, dependencies });

    expect(result.isCacheHit).toBe(true);
    expect(result.worktrees).toEqual([
      {
        repo: "app-a",
        branch: "feature/a",
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
      },
    ]);
    expect(dependencies.loadWorktrees).not.toHaveBeenCalled();
  });

  it("fresh 指定時は cache を使わずに worktree 一覧を取得する", async () => {
    const context = buildContext();
    const dependencies = buildDependencies();
    vi.mocked(dependencies.loadCachedWorktrees).mockResolvedValueOnce([
      {
        repo: "app-a",
        branch: "stale",
        path: "/tmp/worktrees/app-a~_~stale",
      },
    ]);

    await listWorktreesUsecase.list({ context, dependencies, options: { preferCache: false } });

    expect(dependencies.loadCachedWorktrees).not.toHaveBeenCalled();
    expect(dependencies.loadWorktrees).toHaveBeenCalledWith("/tmp/worktrees");
  });
});
