import { LocalStorage } from "@raycast/api";

type CachedWorktreeEntry = {
  repo: string;
  branch: string;
  path: string;
  originPath?: string;
};

type CachedWorktreeDirectoryState = {
  relativePath: string;
  mtimeMs: number;
};

type CachedGitMarkerState = {
  relativePath: string;
  kind: "file" | "directory";
  mtimeMs: number;
  size: number;
  content: string | null;
};

type CachedWorktreeRepoState = {
  mtimeMs: number;
  directories: CachedWorktreeDirectoryState[];
  gitMarkers: CachedGitMarkerState[];
};

type CachedWorktreeDeck = {
  version: number;
  basePath: string;
  cachedAt: number;
  repos: Record<string, CachedWorktreeRepoState>;
  worktreesByRepo: Record<string, CachedWorktreeEntry[]>;
};

export type { CachedGitMarkerState, CachedWorktreeDirectoryState, CachedWorktreeEntry, CachedWorktreeRepoState };

/**
 * ワークツリー一覧キャッシュのスキーマバージョン
 */
export const WORKTREE_DECK_CACHE_VERSION = 5;
/**
 * ワークツリー一覧キャッシュキーの接頭辞
 */
const WORKTREE_DECK_CACHE_KEY_PREFIX = "worktree-deck.scan-cache.v5:";

function buildWorktreeDeckCacheKey(basePath: string): string {
  return `${WORKTREE_DECK_CACHE_KEY_PREFIX}${encodeURIComponent(basePath)}`;
}

/**
 * ワークツリー一覧キャッシュを読み込む
 */
export async function loadWorktreeDeckCache(basePath: string): Promise<CachedWorktreeDeck | null> {
  try {
    const raw = await LocalStorage.getItem<string>(buildWorktreeDeckCacheKey(basePath));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizeCachedWorktreeDeck(parsed);
  } catch {
    return null;
  }
}

/**
 * ワークツリー一覧キャッシュを保存する
 */
export async function saveWorktreeDeckCache(storage: CachedWorktreeDeck): Promise<void> {
  try {
    await LocalStorage.setItem(buildWorktreeDeckCacheKey(storage.basePath), JSON.stringify(storage));
  } catch {
    // キャッシュ保存失敗は一覧取得を止めない
  }
}

/**
 * ワークツリー一覧キャッシュを型安全に正規化する
 */
function normalizeCachedWorktreeDeck(raw: unknown): CachedWorktreeDeck | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const rawValue = raw as Record<string, unknown>;
  if (typeof rawValue.version !== "number" || rawValue.version !== WORKTREE_DECK_CACHE_VERSION) {
    return null;
  }
  const basePath = typeof rawValue.basePath === "string" ? rawValue.basePath : null;
  const cachedAt = typeof rawValue.cachedAt === "number" ? rawValue.cachedAt : null;
  if (!basePath || cachedAt == null) {
    return null;
  }

  if (typeof rawValue.repos !== "object" || rawValue.repos == null || Array.isArray(rawValue.repos)) {
    return null;
  }
  const repos: Record<string, CachedWorktreeRepoState> = {};
  for (const [repoName, rawRepoState] of Object.entries(rawValue.repos)) {
    if (!rawRepoState || typeof rawRepoState !== "object" || Array.isArray(rawRepoState)) {
      continue;
    }
    const repoState = rawRepoState as Record<string, unknown>;
    const mtimeMs = typeof repoState.mtimeMs === "number" ? repoState.mtimeMs : null;
    const directoriesRaw = repoState.directories;
    const gitMarkersRaw = repoState.gitMarkers;
    if (mtimeMs == null || !Array.isArray(directoriesRaw) || !Array.isArray(gitMarkersRaw)) {
      continue;
    }
    const directories: CachedWorktreeDirectoryState[] = [];
    for (const rawDirectory of directoriesRaw) {
      if (!rawDirectory || typeof rawDirectory !== "object" || Array.isArray(rawDirectory)) {
        continue;
      }
      const directory = rawDirectory as Record<string, unknown>;
      const relativePath = typeof directory.relativePath === "string" ? directory.relativePath : null;
      const directoryMtimeMs = typeof directory.mtimeMs === "number" ? directory.mtimeMs : null;
      if (relativePath == null || directoryMtimeMs == null) {
        continue;
      }
      directories.push({
        relativePath,
        mtimeMs: directoryMtimeMs,
      });
    }
    if (directories.length === 0) {
      continue;
    }
    const gitMarkers: CachedGitMarkerState[] = [];
    for (const rawGitMarker of gitMarkersRaw) {
      if (!rawGitMarker || typeof rawGitMarker !== "object" || Array.isArray(rawGitMarker)) {
        continue;
      }
      const gitMarker = rawGitMarker as Record<string, unknown>;
      const relativePath = typeof gitMarker.relativePath === "string" ? gitMarker.relativePath : null;
      const kind = gitMarker.kind === "file" || gitMarker.kind === "directory" ? gitMarker.kind : null;
      const markerMtimeMs = typeof gitMarker.mtimeMs === "number" ? gitMarker.mtimeMs : null;
      const size = typeof gitMarker.size === "number" ? gitMarker.size : null;
      const content = typeof gitMarker.content === "string" ? gitMarker.content : null;
      if (relativePath == null || kind == null || markerMtimeMs == null || size == null) {
        continue;
      }
      gitMarkers.push({
        relativePath,
        kind,
        mtimeMs: markerMtimeMs,
        size,
        content,
      });
    }
    repos[repoName] = { mtimeMs, directories, gitMarkers };
  }

  if (
    typeof rawValue.worktreesByRepo !== "object" ||
    rawValue.worktreesByRepo == null ||
    Array.isArray(rawValue.worktreesByRepo)
  ) {
    return null;
  }
  const worktreesByRepo: Record<string, CachedWorktreeEntry[]> = {};
  for (const [repoName, rawEntries] of Object.entries(rawValue.worktreesByRepo)) {
    if (!Array.isArray(rawEntries)) {
      continue;
    }
    const normalizedEntries: CachedWorktreeEntry[] = [];
    for (const rawEntry of rawEntries) {
      if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
        continue;
      }
      const entryValue = rawEntry as Record<string, unknown>;
      const path = typeof entryValue.path === "string" ? entryValue.path : null;
      const repo = typeof entryValue.repo === "string" ? entryValue.repo : null;
      const branch = typeof entryValue.branch === "string" ? entryValue.branch : null;
      if (!path || !repo || !branch) {
        continue;
      }
      const originPath = typeof entryValue.originPath === "string" ? entryValue.originPath : undefined;
      normalizedEntries.push({
        repo,
        branch,
        path,
        originPath,
      });
    }
    worktreesByRepo[repoName] = normalizedEntries;
  }

  return {
    version: WORKTREE_DECK_CACHE_VERSION,
    basePath,
    cachedAt,
    repos,
    worktreesByRepo,
  };
}
