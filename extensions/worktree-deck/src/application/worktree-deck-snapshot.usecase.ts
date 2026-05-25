import type { RepositoryMapping } from "../domain/repository-mapping.service";
import type { WorktreeOpenAppMeta } from "../domain/worktree-open-app.service";
import type { ListWorktreesResult, WorktreeDeckContext } from "./list-worktrees.usecase";
import type { Worktree } from "./worktree.entity";
import type { WorktreeTitle } from "./worktree-title.entity";
export type { WorktreeTitle };

/**
 * snapshot 読み込み内の計測ログを受け取る関数
 */
type WorktreeDeckSnapshotTimingLogger = (label: string, elapsedMs: number) => void;

/**
 * 表示キャッシュ適用後の一覧状態
 */
export type RestoredWorktreeDeckSnapshot = {
  worktrees: Worktree[];
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  openAppMetaByPath: Map<string, WorktreeOpenAppMeta>;
};

/**
 * 初期 snapshot 読み込みの依存ポート
 */
export type LoadWorktreeDeckInitialSnapshotDependencies = {
  listWorktrees(
    context: WorktreeDeckContext,
    options?: {
      preferCache?: boolean;
    },
  ): Promise<ListWorktreesResult>;
  restoreDisplayCache(args: {
    worktrees: Worktree[];
    mappings: RepositoryMapping[];
    displayCache: unknown;
  }): RestoredWorktreeDeckSnapshot;
  loadOpenAppMetaByWorktreePath(paths: string[]): Promise<Map<string, WorktreeOpenAppMeta>>;
};

/**
 * 初期 snapshot 読み込み結果
 */
type WorktreeDeckInitialSnapshot = {
  basePath: string;
  mappings: RepositoryMapping[];
  listedWorktrees: Worktree[];
  worktrees: Worktree[];
  isWorktreeListCacheHit: boolean;
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  openAppMetaByPath: Map<string, WorktreeOpenAppMeta>;
};

/**
 * タイトル snapshot 読み込みの依存ポート
 */
export type LoadWorktreeDeckTitlesSnapshotDependencies = {
  loadTitlesForPaths(args: {
    paths: string[];
    env: NodeJS.ProcessEnv;
    cwd: string;
    homeDir: string | null;
    assetsPath: string;
    packageDir: string;
    packageName: string;
    timingLabelPrefix?: string;
    logTiming?: (label: string, elapsedMs: number) => void;
  }): Promise<Map<string, WorktreeTitle[]>>;
  attachWorktreeTitles(args: {
    worktrees: Worktree[];
    env: NodeJS.ProcessEnv;
    cwd: string;
    homeDir: string | null;
    assetsPath: string;
    packageDir: string;
    packageName: string;
    titlesByPath: Map<string, WorktreeTitle[]>;
  }): Promise<Worktree[]>;
};

/**
 * タイトル snapshot 読み込み結果
 */
type WorktreeDeckTitlesSnapshot = {
  titlesByPath: Map<string, WorktreeTitle[]>;
  worktrees: Worktree[];
};

/**
 * 詳細 snapshot 読み込みの依存ポート
 */
export type LoadWorktreeDeckDetailsSnapshotDependencies = {
  loadLastCommitAtByPath(paths: string[]): Promise<Map<string, string | null>>;
  loadCurrentBranchByPath(paths: string[]): Promise<Map<string, string | null>>;
  loadBaseRefByWorktreePath(paths: string[]): Promise<Map<string, string>>;
  loadOpenAppMetaByWorktreePath(paths: string[]): Promise<Map<string, WorktreeOpenAppMeta>>;
  loadWorktreeMetadata(worktrees: Worktree[], options: { baseRefByPath: Map<string, string> }): Promise<Worktree[]>;
  loadAheadBehindCounts(args: {
    worktreePath: string;
    baseRef: string;
  }): Promise<{ aheadCount: number; behindCount: number } | null>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
};

/**
 * 詳細 snapshot 読み込み結果
 */
type WorktreeDeckDetailsSnapshot = {
  mappings: RepositoryMapping[];
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  openAppMetaByPath: Map<string, WorktreeOpenAppMeta>;
  worktrees: Worktree[];
};

/**
 * 指定ラベルの非同期処理にかかった時間を記録する
 */
async function measureSnapshotStep<TValue>(args: {
  label: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
  task: () => Promise<TValue>;
}): Promise<TValue> {
  const startMs = Date.now();
  try {
    return await args.task();
  } finally {
    args.logTiming?.(args.label, Date.now() - startMs);
  }
}

/**
 * 指定ラベルの同期処理にかかった時間を記録する
 */
function measureSnapshotSyncStep<TValue>(args: {
  label: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
  task: () => TValue;
}): TValue {
  const startMs = Date.now();
  try {
    return args.task();
  } finally {
    args.logTiming?.(args.label, Date.now() - startMs);
  }
}

/**
 * worktree をログ用に短く表現する
 */
function formatWorktreeTimingName(worktree: Worktree): string {
  return `${worktree.repo}:${worktree.branch ?? "root"}`;
}

/**
 * worktree と mapping から重複なしの表示対象パスを返す
 */
function collectDisplayPaths(args: {
  worktrees: Worktree[];
  mappings: RepositoryMapping[];
  includeOriginEntries: boolean;
}): string[] {
  const paths = new Set<string>();
  for (const item of args.worktrees) {
    paths.add(item.path);
    if (args.includeOriginEntries && item.originPath != null && item.originPath.length > 0) {
      paths.add(item.originPath);
    }
  }
  if (args.includeOriginEntries) {
    for (const mapping of args.mappings) {
      if (mapping.repoRoot != null && mapping.repoRoot.length > 0) {
        paths.add(mapping.repoRoot);
      }
    }
  }
  return Array.from(paths);
}

/**
 * worktree と mapping から重複なしの origin パスを返す
 */
function collectOriginPaths(args: {
  worktrees: Worktree[];
  mappings: RepositoryMapping[];
  includeOriginEntries: boolean;
}): string[] {
  if (!args.includeOriginEntries) {
    return [];
  }
  const paths = new Set<string>();
  for (const item of args.worktrees) {
    if (item.originPath != null && item.originPath.length > 0) {
      paths.add(item.originPath);
    }
  }
  for (const mapping of args.mappings) {
    if (mapping.repoRoot != null && mapping.repoRoot.length > 0) {
      paths.add(mapping.repoRoot);
    }
  }
  return Array.from(paths);
}

/**
 * 初期一覧 snapshot を読み込む
 */
async function loadInitialSnapshot(args: {
  context: WorktreeDeckContext;
  displayCache: unknown;
  dependencies: LoadWorktreeDeckInitialSnapshotDependencies;
  preferCachedWorktrees?: boolean;
  includeOriginEntries?: boolean;
  timingLabelPrefix?: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
}): Promise<WorktreeDeckInitialSnapshot> {
  const timingLabelPrefix = args.timingLabelPrefix ?? "loadInitialSnapshot";
  const includeOriginEntries = args.includeOriginEntries ?? true;
  const listed = await measureSnapshotStep({
    label: `${timingLabelPrefix}:listWorktrees`,
    logTiming: args.logTiming,
    task: () => args.dependencies.listWorktrees(args.context, { preferCache: args.preferCachedWorktrees !== false }),
  });
  const restored = measureSnapshotSyncStep({
    label: `${timingLabelPrefix}:restoreDisplayCache(worktrees=${listed.worktrees.length})`,
    logTiming: args.logTiming,
    task: () =>
      args.dependencies.restoreDisplayCache({
        worktrees: listed.worktrees,
        mappings: listed.mappings,
        displayCache: args.displayCache,
      }),
  });
  let openAppMetaByPath = restored.openAppMetaByPath;
  try {
    const displayPaths = collectDisplayPaths({
      worktrees: listed.worktrees,
      mappings: listed.mappings,
      includeOriginEntries,
    });
    openAppMetaByPath = await measureSnapshotStep({
      label: `${timingLabelPrefix}:loadOpenAppMetaByWorktreePath(paths=${displayPaths.length})`,
      logTiming: args.logTiming,
      task: () => args.dependencies.loadOpenAppMetaByWorktreePath(displayPaths),
    });
  } catch {
    // 起動アプリ設定の先読み失敗時は表示キャッシュを利用する
  }
  return {
    basePath: listed.basePath,
    mappings: listed.mappings,
    listedWorktrees: listed.worktrees,
    worktrees: restored.worktrees,
    isWorktreeListCacheHit: listed.isCacheHit,
    titlesByPath: restored.titlesByPath,
    originLastCommitByPath: restored.originLastCommitByPath,
    originBranchByPath: restored.originBranchByPath,
    openAppMetaByPath,
  };
}

/**
 * セッションタイトル snapshot を読み込む
 */
async function loadTitlesSnapshot(args: {
  context: WorktreeDeckContext;
  worktrees: Worktree[];
  mappings: RepositoryMapping[];
  dependencies: LoadWorktreeDeckTitlesSnapshotDependencies;
  includeOriginEntries?: boolean;
  timingLabelPrefix?: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
}): Promise<WorktreeDeckTitlesSnapshot> {
  const timingLabelPrefix = args.timingLabelPrefix ?? "loadTitlesSnapshot";
  const includeOriginEntries = args.includeOriginEntries ?? true;
  let titlesByPath = new Map<string, WorktreeTitle[]>();
  try {
    const displayPaths = collectDisplayPaths({
      worktrees: args.worktrees,
      mappings: args.mappings,
      includeOriginEntries,
    });
    titlesByPath = await measureSnapshotStep({
      label: `${timingLabelPrefix}:loadTitlesForPaths(paths=${displayPaths.length})`,
      logTiming: args.logTiming,
      task: () =>
        args.dependencies.loadTitlesForPaths({
          paths: displayPaths,
          env: args.context.env,
          cwd: args.context.cwd,
          homeDir: args.context.homeDir,
          assetsPath: args.context.assetsPath,
          packageDir: args.context.packageDir,
          packageName: args.context.packageName,
          ...(args.logTiming
            ? {
                timingLabelPrefix: `${timingLabelPrefix}:loadTitlesForPaths`,
                logTiming: args.logTiming,
              }
            : {}),
        }),
    });
  } catch {
    titlesByPath = new Map();
  }
  const worktrees = await measureSnapshotStep({
    label: `${timingLabelPrefix}:attachWorktreeTitles(worktrees=${args.worktrees.length})`,
    logTiming: args.logTiming,
    task: () =>
      args.dependencies.attachWorktreeTitles({
        worktrees: args.worktrees,
        env: args.context.env,
        cwd: args.context.cwd,
        homeDir: args.context.homeDir,
        assetsPath: args.context.assetsPath,
        packageDir: args.context.packageDir,
        packageName: args.context.packageName,
        titlesByPath,
      }),
  });
  return { titlesByPath, worktrees };
}

/**
 * baseRef と ahead/behind 情報を付与する
 */
async function attachWorktreeBaseDiffs(args: {
  worktrees: Worktree[];
  baseRefByPath: Map<string, string>;
  dependencies: Pick<LoadWorktreeDeckDetailsSnapshotDependencies, "loadAheadBehindCounts" | "resolveMergeTargetRef">;
  timingLabelPrefix?: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
}): Promise<Worktree[]> {
  const timingLabelPrefix = args.timingLabelPrefix ?? "attachWorktreeBaseDiffs";
  return Promise.all(
    args.worktrees.map(async (item) => {
      const worktreeName = formatWorktreeTimingName(item);
      const storedBaseRef = args.baseRefByPath.get(item.path) ?? null;
      if (item.mergeStatus === "dirty") {
        const resolvedBaseRef =
          item.baseRef ??
          storedBaseRef ??
          (await measureSnapshotStep({
            label: `${timingLabelPrefix}:resolveMergeTargetRef(${worktreeName})`,
            logTiming: args.logTiming,
            task: () => args.dependencies.resolveMergeTargetRef(item.path),
          }));
        return {
          ...item,
          baseRef: resolvedBaseRef,
          aheadCount: null,
          behindCount: null,
        };
      }
      const resolved = await resolveBaseRefWithCounts({
        worktreePath: item.path,
        baseRef: item.baseRef ?? storedBaseRef,
        storedBaseRef,
        dependencies: args.dependencies,
        timingLabelPrefix,
        logTiming: args.logTiming,
        worktreeName,
      });
      return {
        ...item,
        baseRef: resolved.baseRef,
        aheadCount: resolved.aheadCount,
        behindCount: resolved.behindCount,
      };
    }),
  );
}

/**
 * baseRef を優先して差分情報を取得する
 */
async function resolveBaseRefWithCounts(args: {
  worktreePath: string;
  baseRef: string | null;
  storedBaseRef: string | null;
  dependencies: Pick<LoadWorktreeDeckDetailsSnapshotDependencies, "loadAheadBehindCounts" | "resolveMergeTargetRef">;
  timingLabelPrefix?: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
  worktreeName: string;
}): Promise<{ baseRef: string | null; aheadCount: number | null; behindCount: number | null }> {
  const timingLabelPrefix = args.timingLabelPrefix ?? "resolveBaseRefWithCounts";
  const resolvedBaseRef = args.baseRef ?? args.storedBaseRef;
  if (resolvedBaseRef == null || resolvedBaseRef.length === 0) {
    return { baseRef: null, aheadCount: null, behindCount: null };
  }
  const counts = await measureSnapshotStep({
    label: `${timingLabelPrefix}:loadAheadBehindCounts(${args.worktreeName},baseRef=${resolvedBaseRef})`,
    logTiming: args.logTiming,
    task: () =>
      args.dependencies.loadAheadBehindCounts({
        worktreePath: args.worktreePath,
        baseRef: resolvedBaseRef,
      }),
  });
  if (counts != null) {
    return { baseRef: resolvedBaseRef, aheadCount: counts.aheadCount, behindCount: counts.behindCount };
  }
  if (args.storedBaseRef != null && args.storedBaseRef.length > 0 && resolvedBaseRef === args.storedBaseRef) {
    const fallbackBaseRef = await measureSnapshotStep({
      label: `${timingLabelPrefix}:resolveMergeTargetRef(${args.worktreeName})`,
      logTiming: args.logTiming,
      task: () => args.dependencies.resolveMergeTargetRef(args.worktreePath),
    });
    if (fallbackBaseRef == null || fallbackBaseRef.length === 0) {
      return { baseRef: resolvedBaseRef, aheadCount: null, behindCount: null };
    }
    const fallbackCounts = await measureSnapshotStep({
      label: `${timingLabelPrefix}:loadAheadBehindCounts(${args.worktreeName},baseRef=${fallbackBaseRef})`,
      logTiming: args.logTiming,
      task: () =>
        args.dependencies.loadAheadBehindCounts({
          worktreePath: args.worktreePath,
          baseRef: fallbackBaseRef,
        }),
    });
    return {
      baseRef: fallbackBaseRef,
      aheadCount: fallbackCounts?.aheadCount ?? null,
      behindCount: fallbackCounts?.behindCount ?? null,
    };
  }
  return { baseRef: resolvedBaseRef, aheadCount: null, behindCount: null };
}

/**
 * 詳細情報 snapshot を読み込む
 */
async function loadDetailsSnapshot(args: {
  worktrees: Worktree[];
  mappings: RepositoryMapping[];
  dependencies: LoadWorktreeDeckDetailsSnapshotDependencies;
  includeOriginEntries?: boolean;
  timingLabelPrefix?: string;
  logTiming?: WorktreeDeckSnapshotTimingLogger;
}): Promise<WorktreeDeckDetailsSnapshot> {
  const timingLabelPrefix = args.timingLabelPrefix ?? "loadDetailsSnapshot";
  const includeOriginEntries = args.includeOriginEntries ?? true;
  let originLastCommitByPath = new Map<string, string | null>();
  let originBranchByPath = new Map<string, string | null>();
  let baseRefByPath = new Map<string, string>();
  let openAppMetaByPath = new Map<string, WorktreeOpenAppMeta>();
  const originPaths = collectOriginPaths({ worktrees: args.worktrees, mappings: args.mappings, includeOriginEntries });
  const worktreePaths = args.worktrees.map((item) => item.path);
  const displayPaths = collectDisplayPaths({
    worktrees: args.worktrees,
    mappings: args.mappings,
    includeOriginEntries,
  });
  const originDataPromise = (async () => {
    try {
      const [lastCommitByPath, branchByPath] = await Promise.all([
        measureSnapshotStep({
          label: `${timingLabelPrefix}:loadLastCommitAtByPath(paths=${originPaths.length})`,
          logTiming: args.logTiming,
          task: () => args.dependencies.loadLastCommitAtByPath(originPaths),
        }),
        measureSnapshotStep({
          label: `${timingLabelPrefix}:loadCurrentBranchByPath(paths=${originPaths.length})`,
          logTiming: args.logTiming,
          task: () => args.dependencies.loadCurrentBranchByPath(originPaths),
        }),
      ]);
      return {
        originLastCommitByPath: lastCommitByPath,
        originBranchByPath: branchByPath,
      };
    } catch {
      return {
        originLastCommitByPath: new Map<string, string | null>(),
        originBranchByPath: new Map<string, string | null>(),
      };
    }
  })();
  const baseRefPromise = (async () => {
    try {
      return await measureSnapshotStep({
        label: `${timingLabelPrefix}:loadBaseRefByWorktreePath(paths=${worktreePaths.length})`,
        logTiming: args.logTiming,
        task: () => args.dependencies.loadBaseRefByWorktreePath(worktreePaths),
      });
    } catch {
      return new Map<string, string>();
    }
  })();
  const openAppMetaPromise = (async () => {
    try {
      return await measureSnapshotStep({
        label: `${timingLabelPrefix}:loadOpenAppMetaByWorktreePath(paths=${displayPaths.length})`,
        logTiming: args.logTiming,
        task: () => args.dependencies.loadOpenAppMetaByWorktreePath(displayPaths),
      });
    } catch {
      return new Map<string, WorktreeOpenAppMeta>();
    }
  })();
  const [originData, loadedBaseRefByPath, loadedOpenAppMetaByPath] = await Promise.all([
    originDataPromise,
    baseRefPromise,
    openAppMetaPromise,
  ]);
  originLastCommitByPath = originData.originLastCommitByPath;
  originBranchByPath = originData.originBranchByPath;
  baseRefByPath = loadedBaseRefByPath;
  openAppMetaByPath = loadedOpenAppMetaByPath;
  const itemsWithMeta = await measureSnapshotStep({
    label: `${timingLabelPrefix}:loadWorktreeMetadata(worktrees=${args.worktrees.length})`,
    logTiming: args.logTiming,
    task: () => args.dependencies.loadWorktreeMetadata(args.worktrees, { baseRefByPath }),
  });
  const worktrees = await measureSnapshotStep({
    label: `${timingLabelPrefix}:attachWorktreeBaseDiffs(worktrees=${itemsWithMeta.length})`,
    logTiming: args.logTiming,
    task: () =>
      attachWorktreeBaseDiffs({
        worktrees: itemsWithMeta,
        baseRefByPath,
        dependencies: args.dependencies,
        timingLabelPrefix: `${timingLabelPrefix}:attachWorktreeBaseDiffs`,
        logTiming: args.logTiming,
      }),
  });
  return {
    mappings: args.mappings,
    originLastCommitByPath,
    originBranchByPath,
    openAppMetaByPath,
    worktrees,
  };
}

/**
 * worktree 一覧 snapshot ユースケース関数群
 */
export const worktreeDeckSnapshotUsecase = {
  loadInitialSnapshot,
  loadTitlesSnapshot,
  loadDetailsSnapshot,
} as const;
