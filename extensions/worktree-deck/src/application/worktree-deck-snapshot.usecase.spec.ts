import { describe, expect, it, vi } from "vitest";

import type { RepositoryMapping } from "../domain/repository-mapping.service";
import type { WorktreeOpenAppMeta } from "../domain/worktree-open-app.service";
import type { WorktreeDeckContext } from "./list-worktrees.usecase";
import type { Worktree } from "./worktree.entity";
import { type WorktreeTitle, worktreeDeckSnapshotUsecase } from "./worktree-deck-snapshot.usecase";

/**
 * テスト用の worktree-deck 実行コンテキストを返す
 */
function buildContext(): WorktreeDeckContext {
  return {
    env: { HOME: "/Users/tester" },
    cwd: "/repo",
    homeDir: "/Users/tester",
    assetsPath: "/assets",
    packageDir: "/package",
    packageName: "worktree-deck",
  };
}

/**
 * テスト用の worktree を返す
 */
function buildWorktree(args: Partial<Worktree> & Pick<Worktree, "path">): Worktree {
  return {
    repo: args.repo ?? "repo",
    path: args.path,
    branch: args.branch ?? "feature",
    originPath: args.originPath,
    mergeStatus: args.mergeStatus,
    baseRef: args.baseRef,
  };
}

/**
 * テスト用の mapping を返す
 */
function buildMapping(repoRoot: string): RepositoryMapping {
  return {
    id: repoRoot,
    repoRoot,
    enabled: true,
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
  };
}

/**
 * テスト用のセッションタイトルを返す
 */
function buildTitle(title: string): WorktreeTitle {
  return {
    title,
    status: "working",
    latestMessage: null,
    updatedAt: 100,
    sessionKind: "main",
  };
}

describe("worktreeDeckSnapshotUsecase.loadInitialSnapshot", () => {
  it("一覧、表示キャッシュ、起動アプリ設定を組み合わせて初期 snapshot を返す", async () => {
    const listedWorktrees = [buildWorktree({ path: "/repo/worktree", originPath: "/repo/main" })];
    const restoredWorktrees = [{ ...listedWorktrees[0], titleEntries: [buildTitle("cached")] }];
    const mappings = [buildMapping("/repo/main")];
    const cachedOpenAppMeta = new Map<string, WorktreeOpenAppMeta>([
      ["/repo/worktree", { openApp: "zed", threadId: null }],
    ]);
    const storedOpenAppMeta = new Map<string, WorktreeOpenAppMeta>([
      ["/repo/worktree", { openApp: "codex-app", threadId: "11111111-1111-1111-1111-111111111111" }],
    ]);
    const dependencies = {
      listWorktrees: vi.fn(async () => ({
        basePath: "/repo",
        mappings,
        worktrees: listedWorktrees,
        isCacheHit: false,
      })),
      restoreDisplayCache: vi.fn(() => ({
        worktrees: restoredWorktrees,
        titlesByPath: new Map([["/repo/worktree", [buildTitle("cached")]]]),
        originLastCommitByPath: new Map([["/repo/main", "2026-05-04 10:00"]]),
        originBranchByPath: new Map([["/repo/main", "main"]]),
        openAppMetaByPath: cachedOpenAppMeta,
      })),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => storedOpenAppMeta),
    };

    const result = await worktreeDeckSnapshotUsecase.loadInitialSnapshot({
      context: buildContext(),
      displayCache: { version: 1 },
      dependencies,
    });

    expect(result.basePath).toBe("/repo");
    expect(result.mappings).toBe(mappings);
    expect(result.listedWorktrees).toBe(listedWorktrees);
    expect(result.worktrees).toBe(restoredWorktrees);
    expect(result.openAppMetaByPath).toBe(storedOpenAppMeta);
    expect(dependencies.restoreDisplayCache).toHaveBeenCalledWith({
      worktrees: listedWorktrees,
      mappings,
      displayCache: { version: 1 },
    });
    expect(dependencies.loadOpenAppMetaByWorktreePath).toHaveBeenCalledWith(["/repo/worktree", "/repo/main"]);
  });

  it("起動アプリ設定の先読みに失敗したら表示キャッシュの値を使う", async () => {
    const listedWorktrees = [buildWorktree({ path: "/repo/worktree" })];
    const cachedOpenAppMeta = new Map<string, WorktreeOpenAppMeta>([
      ["/repo/worktree", { openApp: "zed", threadId: null }],
    ]);
    const dependencies = {
      listWorktrees: vi.fn(async () => ({
        basePath: "/repo",
        mappings: [],
        worktrees: listedWorktrees,
        isCacheHit: false,
      })),
      restoreDisplayCache: vi.fn(() => ({
        worktrees: listedWorktrees,
        titlesByPath: new Map<string, WorktreeTitle[]>(),
        originLastCommitByPath: new Map<string, string | null>(),
        originBranchByPath: new Map<string, string | null>(),
        openAppMetaByPath: cachedOpenAppMeta,
      })),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
    };

    const result = await worktreeDeckSnapshotUsecase.loadInitialSnapshot({
      context: buildContext(),
      displayCache: null,
      dependencies,
    });

    expect(result.openAppMetaByPath).toBe(cachedOpenAppMeta);
  });
});

describe("worktreeDeckSnapshotUsecase.loadTitlesSnapshot", () => {
  it("worktree path、origin path、mapping repoRoot を集約してタイトルを読み込む", async () => {
    const worktrees = [
      buildWorktree({ path: "/repo/a", originPath: "/repo/main" }),
      buildWorktree({ path: "/repo/b", originPath: "/repo/main" }),
    ];
    const mappings = [buildMapping("/repo/main"), buildMapping("/repo/other")];
    const titlesByPath = new Map<string, WorktreeTitle[]>([["/repo/a", [buildTitle("loaded")]]]);
    const attached = [{ ...worktrees[0], titleEntries: [buildTitle("loaded")] }, worktrees[1]];
    const dependencies = {
      loadTitlesForPaths: vi.fn(async () => titlesByPath),
      attachWorktreeTitles: vi.fn(async () => attached),
    };

    const result = await worktreeDeckSnapshotUsecase.loadTitlesSnapshot({
      context: buildContext(),
      worktrees,
      mappings,
      dependencies,
    });

    expect(result.titlesByPath).toBe(titlesByPath);
    expect(result.worktrees).toBe(attached);
    expect(dependencies.loadTitlesForPaths).toHaveBeenCalledWith({
      paths: ["/repo/a", "/repo/main", "/repo/b", "/repo/other"],
      env: { HOME: "/Users/tester" },
      cwd: "/repo",
      homeDir: "/Users/tester",
      assetsPath: "/assets",
      packageDir: "/package",
      packageName: "worktree-deck",
    });
    expect(dependencies.attachWorktreeTitles).toHaveBeenCalledWith({
      worktrees,
      env: { HOME: "/Users/tester" },
      cwd: "/repo",
      homeDir: "/Users/tester",
      assetsPath: "/assets",
      packageDir: "/package",
      packageName: "worktree-deck",
      titlesByPath,
    });
  });

  it("タイトル読み込みに失敗しても空 Map でタイトル付与を続行する", async () => {
    const worktrees = [buildWorktree({ path: "/repo/a" })];
    const dependencies = {
      loadTitlesForPaths: vi.fn(async () => {
        throw new Error("codex unavailable");
      }),
      attachWorktreeTitles: vi.fn(async (args: { worktrees: Worktree[] }) => args.worktrees),
    };

    const result = await worktreeDeckSnapshotUsecase.loadTitlesSnapshot({
      context: buildContext(),
      worktrees,
      mappings: [],
      dependencies,
    });

    expect(result.titlesByPath.size).toBe(0);
    expect(dependencies.attachWorktreeTitles.mock.calls[0]?.[0].titlesByPath.size).toBe(0);
  });

  it("origin 非表示時は worktree path だけでタイトルを読み込む", async () => {
    const worktrees = [buildWorktree({ path: "/repo/a", originPath: "/repo/main" })];
    const mappings = [buildMapping("/repo/main")];
    const dependencies = {
      loadTitlesForPaths: vi.fn(async () => new Map<string, WorktreeTitle[]>()),
      attachWorktreeTitles: vi.fn(async (args: { worktrees: Worktree[] }) => args.worktrees),
    };

    await worktreeDeckSnapshotUsecase.loadTitlesSnapshot({
      context: buildContext(),
      worktrees,
      mappings,
      dependencies,
      includeOriginEntries: false,
    });

    expect(dependencies.loadTitlesForPaths.mock.calls[0]?.[0].paths).toEqual(["/repo/a"]);
  });
});

describe("worktreeDeckSnapshotUsecase.loadDetailsSnapshot", () => {
  it("origin 情報、baseRef、起動アプリ、metadata、base diff を統合する", async () => {
    const worktrees = [
      buildWorktree({ path: "/repo/a", originPath: "/repo/main" }),
      buildWorktree({ path: "/repo/b", originPath: "/repo/main", mergeStatus: "dirty" }),
    ];
    const mappings = [buildMapping("/repo/other")];
    const baseRefByPath = new Map([
      ["/repo/a", "main"],
      ["/repo/b", "develop"],
    ]);
    const dependencies = {
      loadLastCommitAtByPath: vi.fn(async () => new Map([["/repo/main", "2026-05-04 10:00"]])),
      loadCurrentBranchByPath: vi.fn(async () => new Map([["/repo/main", "main"]])),
      loadBaseRefByWorktreePath: vi.fn(async () => baseRefByPath),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => new Map([["/repo/a", { openApp: "zed", threadId: null }]])),
      loadWorktreeMetadata: vi.fn(async (items: Worktree[]) =>
        items.map((item) => ({ ...item, mergeStatus: item.mergeStatus ?? "synced" })),
      ),
      loadAheadBehindCounts: vi.fn(async () => ({ aheadCount: 2, behindCount: 1 })),
      resolveMergeTargetRef: vi.fn(async () => "main"),
    };

    const result = await worktreeDeckSnapshotUsecase.loadDetailsSnapshot({
      worktrees,
      mappings,
      dependencies,
    });

    expect(dependencies.loadLastCommitAtByPath).toHaveBeenCalledWith(["/repo/main", "/repo/other"]);
    expect(dependencies.loadCurrentBranchByPath).toHaveBeenCalledWith(["/repo/main", "/repo/other"]);
    expect(dependencies.loadBaseRefByWorktreePath).toHaveBeenCalledWith(["/repo/a", "/repo/b"]);
    expect(dependencies.loadOpenAppMetaByWorktreePath).toHaveBeenCalledWith([
      "/repo/a",
      "/repo/main",
      "/repo/b",
      "/repo/other",
    ]);
    expect(dependencies.loadWorktreeMetadata).toHaveBeenCalledWith(worktrees, { baseRefByPath });
    expect(result.worktrees).toEqual([
      {
        repo: "repo",
        path: "/repo/a",
        branch: "feature",
        originPath: "/repo/main",
        mergeStatus: "synced",
        baseRef: "main",
        aheadCount: 2,
        behindCount: 1,
      },
      {
        repo: "repo",
        path: "/repo/b",
        branch: "feature",
        originPath: "/repo/main",
        mergeStatus: "dirty",
        baseRef: "develop",
        aheadCount: null,
        behindCount: null,
      },
    ]);
  });

  it("詳細の周辺情報読み込みに失敗したら空 Map にフォールバックして metadata 読み込みを続行する", async () => {
    const worktrees = [buildWorktree({ path: "/repo/a" })];
    const dependencies = {
      loadLastCommitAtByPath: vi.fn(async () => {
        throw new Error("git unavailable");
      }),
      loadCurrentBranchByPath: vi.fn(async () => new Map<string, string | null>()),
      loadBaseRefByWorktreePath: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
      loadWorktreeMetadata: vi.fn(async (items: Worktree[]) => items),
      loadAheadBehindCounts: vi.fn(async () => null),
      resolveMergeTargetRef: vi.fn(async () => null),
    };

    const result = await worktreeDeckSnapshotUsecase.loadDetailsSnapshot({
      worktrees,
      mappings: [],
      dependencies,
    });

    expect(result.originLastCommitByPath.size).toBe(0);
    expect(result.originBranchByPath.size).toBe(0);
    expect(result.openAppMetaByPath.size).toBe(0);
    expect(dependencies.loadWorktreeMetadata).toHaveBeenCalledWith(worktrees, { baseRefByPath: new Map() });
  });

  it("保存済み baseRef で ahead/behind を解決できないときは merge target にフォールバックする", async () => {
    const worktrees = [buildWorktree({ path: "/repo/a" })];
    const dependencies = {
      loadLastCommitAtByPath: vi.fn(async () => new Map<string, string | null>()),
      loadCurrentBranchByPath: vi.fn(async () => new Map<string, string | null>()),
      loadBaseRefByWorktreePath: vi.fn(async () => new Map([["/repo/a", "stale-base"]])),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => new Map<string, WorktreeOpenAppMeta>()),
      loadWorktreeMetadata: vi.fn(async (items: Worktree[]) => items),
      loadAheadBehindCounts: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ aheadCount: 4, behindCount: 3 }),
      resolveMergeTargetRef: vi.fn(async () => "main"),
    };

    const result = await worktreeDeckSnapshotUsecase.loadDetailsSnapshot({
      worktrees,
      mappings: [],
      dependencies,
    });

    expect(dependencies.loadAheadBehindCounts).toHaveBeenNthCalledWith(1, {
      worktreePath: "/repo/a",
      baseRef: "stale-base",
    });
    expect(dependencies.resolveMergeTargetRef).toHaveBeenCalledWith("/repo/a");
    expect(dependencies.loadAheadBehindCounts).toHaveBeenNthCalledWith(2, {
      worktreePath: "/repo/a",
      baseRef: "main",
    });
    expect(result.worktrees[0]).toMatchObject({
      baseRef: "main",
      aheadCount: 4,
      behindCount: 3,
    });
  });

  it("origin 非表示時は origin/mapping path の詳細を読み込まない", async () => {
    const worktrees = [buildWorktree({ path: "/repo/a", originPath: "/repo/main" })];
    const mappings = [buildMapping("/repo/other")];
    const dependencies = {
      loadLastCommitAtByPath: vi.fn(async () => new Map<string, string | null>()),
      loadCurrentBranchByPath: vi.fn(async () => new Map<string, string | null>()),
      loadBaseRefByWorktreePath: vi.fn(async () => new Map<string, string>()),
      loadOpenAppMetaByWorktreePath: vi.fn(async () => new Map<string, WorktreeOpenAppMeta>()),
      loadWorktreeMetadata: vi.fn(async (items: Worktree[]) => items),
      loadAheadBehindCounts: vi.fn(async () => null),
      resolveMergeTargetRef: vi.fn(async () => null),
    };

    await worktreeDeckSnapshotUsecase.loadDetailsSnapshot({
      worktrees,
      mappings,
      dependencies,
      includeOriginEntries: false,
    });

    expect(dependencies.loadLastCommitAtByPath).toHaveBeenCalledWith([]);
    expect(dependencies.loadCurrentBranchByPath).toHaveBeenCalledWith([]);
    expect(dependencies.loadOpenAppMetaByWorktreePath).toHaveBeenCalledWith(["/repo/a"]);
  });
});
