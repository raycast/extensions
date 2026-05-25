import { describe, expect, it, vi } from "vitest";

import type { WorktreeDeckContext } from "../application/list-worktrees.usecase";
import type { Worktree } from "../application/worktree.entity";
import type { WorktreeTitle } from "../application/worktree-title.entity";
import type { WorktreeDeckDataStoreLoadRequest } from "./worktree-deck-data-store";
import { createWorktreeDeckDataStore } from "./worktree-deck-data-store";

type ListWorktreesResultForTest = Awaited<
  ReturnType<WorktreeDeckDataStoreLoadRequest["dependencies"]["initialSnapshot"]["listWorktrees"]>
>;

/**
 * 任意タイミングで解決できる Promise を作る
 */
function createDeferred<TValue>(): {
  promise: Promise<TValue>;
  resolve(value: TValue): void;
  reject(error: unknown): void;
} {
  let resolveValue: (value: TValue) => void = () => undefined;
  let rejectValue: (error: unknown) => void = () => undefined;
  const promise = new Promise<TValue>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });
  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue,
  };
}

/**
 * テスト用の実行コンテキストを作る
 */
function buildContext(): WorktreeDeckContext {
  return {
    env: {},
    cwd: "/repo",
    homeDir: "/Users/tester",
    assetsPath: "/assets",
    packageDir: "/package",
    packageName: "worktree-deck",
  };
}

/**
 * テスト用 worktree を作る
 */
function buildWorktree(path: string): Worktree {
  return {
    repo: "repo",
    branch: "feature/a",
    path,
    originPath: "/repo",
  };
}

/**
 * テスト用タイトルを作る
 */
function buildTitle(args: {
  title: string;
  sessionPath: string;
  skillUsages?: WorktreeTitle["skillUsages"];
}): WorktreeTitle {
  return {
    title: args.title,
    status: "working",
    latestMessage: null,
    updatedAt: 1,
    sessionPath: args.sessionPath,
    sessionKind: "main",
    skillUsages: args.skillUsages,
  };
}

/**
 * 非同期の後続タスクを進める
 */
async function flushAsyncTasks(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });
}

/**
 * Promise chain だけを進める
 */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * store 読み込みリクエストを作る
 */
function buildRequest(
  args: {
    listWorktrees?: WorktreeDeckDataStoreLoadRequest["dependencies"]["initialSnapshot"]["listWorktrees"];
    includeOriginEntries?: boolean;
  } = {},
): WorktreeDeckDataStoreLoadRequest {
  const worktree = buildWorktree("/worktrees/repo~_~feature-a");
  const listWorktrees =
    args.listWorktrees ??
    vi.fn(async () => ({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [worktree],
      isCacheHit: false,
    }));

  return {
    context: buildContext(),
    displayCache: null,
    includeOriginEntries: args.includeOriginEntries ?? true,
    dependencies: {
      initialSnapshot: {
        listWorktrees,
        restoreDisplayCache: vi.fn((input) => ({
          worktrees: input.worktrees,
          titlesByPath: new Map(),
          originLastCommitByPath: new Map(),
          originBranchByPath: new Map(),
          openAppMetaByPath: new Map(),
        })),
        loadOpenAppMetaByWorktreePath: vi.fn(async () => new Map()),
      },
      titlesSnapshot: {
        loadTitlesForPaths: vi.fn(async () => new Map()),
        attachWorktreeTitles: vi.fn(async (input) => input.worktrees),
      },
      detailsSnapshot: {
        loadLastCommitAtByPath: vi.fn(async () => new Map()),
        loadCurrentBranchByPath: vi.fn(async () => new Map()),
        loadBaseRefByWorktreePath: vi.fn(async () => new Map()),
        loadOpenAppMetaByWorktreePath: vi.fn(async () => new Map()),
        loadWorktreeMetadata: vi.fn(async (items) => items),
        loadAheadBehindCounts: vi.fn(async () => null),
        resolveMergeTargetRef: vi.fn(async () => null),
      },
      sessionFile: {
        findFirstSessionFileByPath: vi.fn(async () => null),
        findLatestSessionFileByPath: vi.fn(async () => null),
        saveCodexThreadIdForWorktreePath: vi.fn(async () => undefined),
        openPathInConfiguredIde: vi.fn(async () => undefined),
        loadLatestSessionMessages: vi.fn(async () => []),
        loadSessionMessages: vi.fn(async () => []),
      },
    },
    logTiming: vi.fn(),
    logWorktreeNames: vi.fn(),
  };
}

describe("createWorktreeDeckDataStore", () => {
  it("ensureLoaded の同時呼び出しでは初期 snapshot 読み込みを共有する", async () => {
    const store = createWorktreeDeckDataStore();
    const deferred = createDeferred<ListWorktreesResultForTest>();
    const listWorktrees = vi.fn(() => deferred.promise);
    const request = buildRequest({ listWorktrees });

    const first = store.ensureLoaded(request);
    const second = store.ensureLoaded(request);

    expect(listWorktrees).toHaveBeenCalledTimes(1);

    deferred.resolve({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [buildWorktree("/worktrees/repo~_~feature-a")],
      isCacheHit: false,
    });
    await Promise.all([first, second]);

    expect(store.getSnapshot().isLoading).toBe(false);
    expect(store.getSnapshot().worktrees).toHaveLength(1);
    expect(request.logTiming).toHaveBeenCalledWith("loadWorktreesState:listWorktrees", expect.any(Number));
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreesState:restoreDisplayCache(worktrees=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreesState:loadOpenAppMetaByWorktreePath(paths=2)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith("loadWorktreesState", expect.any(Number));
    await flushAsyncTasks();
  });

  it("読み込み済みの ensureLoaded では初期 snapshot を再取得しない", async () => {
    const store = createWorktreeDeckDataStore();
    const request = buildRequest();
    const listWorktrees = vi.mocked(request.dependencies.initialSnapshot.listWorktrees);

    await store.ensureLoaded(request);
    await store.ensureLoaded(request);
    await flushAsyncTasks();

    expect(listWorktrees).toHaveBeenCalledTimes(1);
  });

  it("reload では初期 snapshot を明示的に再取得する", async () => {
    const store = createWorktreeDeckDataStore();
    const request = buildRequest();
    const listWorktrees = vi.mocked(request.dependencies.initialSnapshot.listWorktrees);

    await store.ensureLoaded(request);
    await store.reload(request);
    await flushAsyncTasks();

    expect(listWorktrees).toHaveBeenCalledTimes(2);
    expect(listWorktrees.mock.calls[0]?.[1]).toEqual({ preferCache: true });
    expect(listWorktrees.mock.calls[1]?.[1]).toEqual({ preferCache: false });
  });

  it("cache hit の初期 snapshot 後に fresh scan でバックグラウンド更新する", async () => {
    const store = createWorktreeDeckDataStore();
    const cachedWorktree = buildWorktree("/worktrees/repo~_~cached");
    const freshWorktree = buildWorktree("/worktrees/repo~_~fresh");
    const freshDeferred = createDeferred<ListWorktreesResultForTest>();
    const listWorktrees = vi
      .fn()
      .mockResolvedValueOnce({
        basePath: "/worktrees",
        mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
        worktrees: [cachedWorktree],
        isCacheHit: true,
      })
      .mockReturnValueOnce(freshDeferred.promise);
    const request = buildRequest({ listWorktrees });

    await store.ensureLoaded(request);

    expect(store.getSnapshot().listedWorktrees).toEqual([cachedWorktree]);
    await flushAsyncTasks();
    expect(request.dependencies.titlesSnapshot.loadTitlesForPaths).toHaveBeenCalledTimes(1);
    freshDeferred.resolve({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [freshWorktree],
      isCacheHit: false,
    });
    await flushAsyncTasks();
    expect(store.getSnapshot().listedWorktrees).toEqual([freshWorktree]);
    expect(request.dependencies.titlesSnapshot.loadTitlesForPaths).toHaveBeenCalledTimes(2);
    expect(listWorktrees.mock.calls[0]?.[1]).toEqual({ preferCache: true });
    expect(listWorktrees.mock.calls[1]?.[1]).toEqual({ preferCache: false });
  });

  it("cache hit 後の fresh scan 失敗時も cache snapshot のタイトルと詳細を読み込む", async () => {
    const store = createWorktreeDeckDataStore();
    const cachedWorktree = buildWorktree("/worktrees/repo~_~cached");
    const listWorktrees = vi
      .fn()
      .mockResolvedValueOnce({
        basePath: "/worktrees",
        mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
        worktrees: [cachedWorktree],
        isCacheHit: true,
      })
      .mockRejectedValueOnce(new Error("fresh scan failed"));
    const request = buildRequest({ listWorktrees });

    await store.ensureLoaded(request);
    await flushAsyncTasks();

    expect(store.getSnapshot().listedWorktrees).toEqual([cachedWorktree]);
    expect(request.dependencies.titlesSnapshot.loadTitlesForPaths).toHaveBeenCalledTimes(1);
    expect(request.dependencies.detailsSnapshot.loadWorktreeMetadata).toHaveBeenCalledTimes(1);
  });

  it("fresh scan の初期 snapshot で表示中の Git 状態を古い表示キャッシュへ巻き戻さない", async () => {
    const store = createWorktreeDeckDataStore();
    const worktreePath = "/worktrees/repo~_~feature-a";
    const staleWorktree = {
      ...buildWorktree(worktreePath),
      mergeStatus: "dirty" as const,
      baseRef: "stale-base",
      aheadCount: null,
      behindCount: null,
    };
    const freshWorktree = buildWorktree(worktreePath);
    const freshListDeferred = createDeferred<ListWorktreesResultForTest>();
    const secondDetailsDeferred = createDeferred<Worktree[]>();
    const listWorktrees = vi
      .fn()
      .mockResolvedValueOnce({
        basePath: "/worktrees",
        mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
        worktrees: [freshWorktree],
        isCacheHit: true,
      })
      .mockReturnValueOnce(freshListDeferred.promise);
    const request = buildRequest({ listWorktrees });
    vi.mocked(request.dependencies.initialSnapshot.restoreDisplayCache).mockImplementation((input) => ({
      worktrees: input.worktrees.map((item) => ({ ...item, ...staleWorktree })),
      titlesByPath: new Map(),
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      openAppMetaByPath: new Map(),
    }));
    vi.mocked(request.dependencies.detailsSnapshot.loadWorktreeMetadata)
      .mockResolvedValueOnce([
        {
          ...freshWorktree,
          mergeStatus: "synced",
          baseRef: "main",
          lastCommitAt: "2026-05-24 10:00",
        },
      ])
      .mockReturnValueOnce(secondDetailsDeferred.promise);
    vi.mocked(request.dependencies.detailsSnapshot.loadAheadBehindCounts).mockResolvedValue({
      aheadCount: 0,
      behindCount: 0,
    });

    await store.ensureLoaded(request);
    await flushAsyncTasks();

    expect(store.getSnapshot().worktrees[0]).toMatchObject({
      mergeStatus: "synced",
      baseRef: "main",
      aheadCount: 0,
      behindCount: 0,
    });

    freshListDeferred.resolve({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [freshWorktree],
      isCacheHit: false,
    });
    await flushMicrotasks();

    expect(store.getSnapshot().worktrees[0]).toMatchObject({
      mergeStatus: "synced",
      baseRef: "main",
      aheadCount: 0,
      behindCount: 0,
    });

    secondDetailsDeferred.resolve([
      {
        ...freshWorktree,
        mergeStatus: "dirty",
        baseRef: "main",
      },
    ]);
    await flushAsyncTasks();

    expect(store.getSnapshot().worktrees[0]).toMatchObject({
      mergeStatus: "dirty",
      baseRef: "main",
      aheadCount: null,
      behindCount: null,
    });
  });

  it("初期ロード中に origin 表示へ切り替えた場合は origin 込みの後続ロードを実行する", async () => {
    const store = createWorktreeDeckDataStore();
    const deferred = createDeferred<ListWorktreesResultForTest>();
    const listWorktrees = vi.fn(() => deferred.promise);
    const request = buildRequest({ listWorktrees, includeOriginEntries: false });
    const expandedRequest = { ...request, includeOriginEntries: true };

    const first = store.ensureLoaded(request);
    const second = store.ensureLoaded(expandedRequest);

    deferred.resolve({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [buildWorktree("/worktrees/repo~_~feature-a")],
      isCacheHit: false,
    });
    await Promise.all([first, second]);
    await flushAsyncTasks();

    expect(request.dependencies.titlesSnapshot.loadTitlesForPaths).toHaveBeenCalledWith(
      expect.objectContaining({
        paths: ["/worktrees/repo~_~feature-a", "/repo"],
      }),
    );
    expect(request.dependencies.detailsSnapshot.loadLastCommitAtByPath).toHaveBeenCalledWith(["/repo"]);
  });

  it("古い fresh scan が完了しても最新の origin 表示要求で後続ロードする", async () => {
    const store = createWorktreeDeckDataStore();
    const cachedWorktree = buildWorktree("/worktrees/repo~_~cached");
    const freshWorktree = buildWorktree("/worktrees/repo~_~fresh");
    const freshDeferred = createDeferred<ListWorktreesResultForTest>();
    const listWorktrees = vi
      .fn()
      .mockResolvedValueOnce({
        basePath: "/worktrees",
        mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
        worktrees: [cachedWorktree],
        isCacheHit: true,
      })
      .mockReturnValueOnce(freshDeferred.promise);
    const request = buildRequest({ listWorktrees, includeOriginEntries: false });
    const expandedRequest = { ...request, includeOriginEntries: true };

    await store.ensureLoaded(request);
    await store.ensureLoaded(expandedRequest);
    freshDeferred.resolve({
      basePath: "/worktrees",
      mappings: [{ repoRoot: "/repo", mapValue: "repo" }],
      worktrees: [freshWorktree],
      isCacheHit: false,
    });
    await flushAsyncTasks();

    expect(store.getSnapshot().listedWorktrees).toEqual([freshWorktree]);
    expect(request.dependencies.titlesSnapshot.loadTitlesForPaths).toHaveBeenLastCalledWith(
      expect.objectContaining({
        paths: ["/worktrees/repo~_~fresh", "/repo"],
      }),
    );
  });

  it("タイトルと詳細の後続ロードを store 状態へ反映する", async () => {
    const store = createWorktreeDeckDataStore();
    const request = buildRequest();
    const titleEntry = {
      title: "Loaded session",
      status: "working" as const,
      latestMessage: null,
      updatedAt: 1,
      sessionKind: "main" as const,
    };
    vi.mocked(request.dependencies.titlesSnapshot.loadTitlesForPaths).mockResolvedValueOnce(
      new Map([["/worktrees/repo~_~feature-a", [titleEntry]]]),
    );
    vi.mocked(request.dependencies.titlesSnapshot.attachWorktreeTitles).mockResolvedValueOnce([
      { ...buildWorktree("/worktrees/repo~_~feature-a"), titleEntries: [titleEntry] },
    ]);
    vi.mocked(request.dependencies.detailsSnapshot.loadWorktreeMetadata).mockResolvedValueOnce([
      { ...buildWorktree("/worktrees/repo~_~feature-a"), mergeStatus: "synced", lastCommitAt: "2026-05-24 10:00" },
    ]);

    await store.ensureLoaded(request);
    await flushAsyncTasks();

    const snapshot = store.getSnapshot();
    expect(snapshot.titlesByPath.get("/worktrees/repo~_~feature-a")).toEqual([titleEntry]);
    expect(snapshot.worktrees[0]?.titleEntries).toEqual([titleEntry]);
    expect(snapshot.worktrees[0]?.mergeStatus).toBe("synced");
    expect(snapshot.worktrees[0]?.lastCommitAt).toBe("2026-05-24 10:00");
    expect(request.logTiming).toHaveBeenCalledWith("loadTitlesState:loadTitlesForPaths(paths=2)", expect.any(Number));
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadTitlesState:attachWorktreeTitles(worktrees=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:loadLastCommitAtByPath(paths=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:loadCurrentBranchByPath(paths=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:loadBaseRefByWorktreePath(paths=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:loadOpenAppMetaByWorktreePath(paths=2)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:loadWorktreeMetadata(worktrees=1)",
      expect.any(Number),
    );
    expect(request.logTiming).toHaveBeenCalledWith(
      "loadWorktreeDetailsState:snapshot:attachWorktreeBaseDiffs(worktrees=1)",
      expect.any(Number),
    );
  });

  it("タイトル再取得で空のスキル履歴が返ってもキャッシュ済みの非空履歴を保持する", async () => {
    const store = createWorktreeDeckDataStore();
    const request = buildRequest();
    const worktreePath = "/worktrees/repo~_~feature-a";
    const sessionPath = "/sessions/session.jsonl";
    const cachedTitle = buildTitle({
      title: "Cached session",
      sessionPath,
      skillUsages: [{ name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" }],
    });
    const refreshedTitle = buildTitle({ title: "Cached session", sessionPath, skillUsages: [] });
    const cachedWorktree = { ...buildWorktree(worktreePath), titleEntries: [cachedTitle] };

    vi.mocked(request.dependencies.initialSnapshot.restoreDisplayCache).mockReturnValue({
      worktrees: [cachedWorktree],
      titlesByPath: new Map([[worktreePath, [cachedTitle]]]),
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      openAppMetaByPath: new Map(),
    });
    vi.mocked(request.dependencies.titlesSnapshot.loadTitlesForPaths).mockResolvedValueOnce(
      new Map([[worktreePath, [refreshedTitle]]]),
    );
    vi.mocked(request.dependencies.titlesSnapshot.attachWorktreeTitles).mockResolvedValueOnce([
      { ...buildWorktree(worktreePath), titleEntries: [refreshedTitle] },
    ]);

    await store.ensureLoaded(request);
    expect(store.getSnapshot().worktrees[0]?.titleEntries?.[0]?.skillUsages).toEqual(cachedTitle.skillUsages);

    await flushAsyncTasks();

    expect(store.getSnapshot().titlesByPath.get(worktreePath)?.[0]?.skillUsages).toEqual(cachedTitle.skillUsages);
    expect(store.getSnapshot().worktrees[0]?.titleEntries?.[0]?.skillUsages).toEqual(cachedTitle.skillUsages);
  });
});
