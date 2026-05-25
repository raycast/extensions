import type { RepositoryMapping } from "../domain/repository-mapping.service";
import {
  sessionLogParserService,
  type SessionKind,
  type SessionSkillUsage,
} from "../domain/session-log-parser.service";
import { worktreeOpenAppService, type WorktreeOpenAppMeta } from "../domain/worktree-open-app.service";
import type { Worktree } from "./worktree.entity";
import type { WorktreeTitle } from "./worktree-title.entity";

/**
 * 表示キャッシュの互換性管理用バージョン
 */
const WORKTREE_DECK_DISPLAY_CACHE_VERSION = 4;

/**
 * 1件の worktree 表示キャッシュ
 */
export type WorktreeDeckDisplayCacheEntry = {
  titleEntries?: WorktreeTitle[];
  mergeStatus?: Worktree["mergeStatus"];
  mergeStatusError?: string | null;
  lastCommitAt?: string | null;
  baseRef?: string | null;
  aheadCount?: number | null;
  behindCount?: number | null;
};

/**
 * worktree 一覧画面で再利用する表示キャッシュ全体
 */
export type WorktreeDeckDisplayCache = {
  version: number;
  worktreesByPath: Record<string, WorktreeDeckDisplayCacheEntry>;
  titlesByPath: Record<string, WorktreeTitle[]>;
  originLastCommitByPath: Record<string, string | null>;
  originBranchByPath: Record<string, string | null>;
  openAppMetaByPath: Record<string, WorktreeOpenAppMeta>;
};

/**
 * キャッシュ適用結果
 */
type AppliedWorktreeDeckDisplayCache = {
  worktrees: Worktree[];
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  openAppMetaByPath: Map<string, WorktreeOpenAppMeta>;
};

/**
 * タイトル配列を複製して整形する
 */
function cloneTitles(entries: WorktreeTitle[] | undefined): WorktreeTitle[] | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry) => ({ ...entry }));
}

/**
 * キャッシュ由来の sessionKind を正規化する
 */
function normalizeSessionKind(value: unknown): SessionKind | null {
  return sessionLogParserService.isSessionKind(value) ? value : null;
}

/**
 * キャッシュ由来のスキル使用履歴を正規化する
 */
function normalizeSessionSkillUsages(value: unknown): SessionSkillUsage[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((item) => {
    if (item == null || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      return [];
    }
    return [
      {
        name: raw.name.trim(),
        timestamp: typeof raw.timestamp === "string" ? raw.timestamp : null,
      },
    ];
  });
}

/**
 * タイトル配列が妥当か判定する
 */
function normalizeTitleEntries(value: unknown): WorktreeTitle[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const entries: WorktreeTitle[] = [];
  for (const rawEntry of value) {
    if (rawEntry == null || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      return null;
    }
    const entry = rawEntry as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title : null;
    const updatedAt = typeof entry.updatedAt === "number" ? entry.updatedAt : null;
    const latestMessage =
      typeof entry.latestMessage === "string" || entry.latestMessage == null ? entry.latestMessage : null;
    const status = entry.status === "working" || entry.status === "done" || entry.status == null ? entry.status : null;
    const startedAt = typeof entry.startedAt === "number" || entry.startedAt == null ? entry.startedAt : null;
    const sessionPath = typeof entry.sessionPath === "string" || entry.sessionPath == null ? entry.sessionPath : null;
    const sessionKind = normalizeSessionKind(entry.sessionKind);
    const isWaitingForUser = typeof entry.isWaitingForUser === "boolean" ? entry.isWaitingForUser : undefined;
    const skillUsages = normalizeSessionSkillUsages(entry.skillUsages);
    if (title == null || title.length === 0 || updatedAt == null || sessionKind == null) {
      return null;
    }
    entries.push({
      title,
      updatedAt,
      latestMessage,
      status,
      startedAt,
      sessionPath: sessionPath ?? undefined,
      sessionKind,
      isWaitingForUser,
      skillUsages,
    });
  }
  return entries;
}

/**
 * 1件の worktree 表示キャッシュを正規化する
 */
function normalizeDisplayCacheEntry(value: unknown): WorktreeDeckDisplayCacheEntry | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const titleEntries = raw.titleEntries == null ? undefined : normalizeTitleEntries(raw.titleEntries);
  if (raw.titleEntries != null && titleEntries == null) {
    return null;
  }
  const mergeStatus =
    raw.mergeStatus === "synced" ||
    raw.mergeStatus === "unmerged" ||
    raw.mergeStatus === "dirty" ||
    raw.mergeStatus === "no-commit" ||
    raw.mergeStatus === "unknown" ||
    raw.mergeStatus == null
      ? raw.mergeStatus
      : undefined;
  if (raw.mergeStatus != null && mergeStatus === undefined) {
    return null;
  }
  const mergeStatusError =
    typeof raw.mergeStatusError === "string" || raw.mergeStatusError == null ? raw.mergeStatusError : undefined;
  if (raw.mergeStatusError != null && mergeStatusError === undefined) {
    return null;
  }
  const lastCommitAt = typeof raw.lastCommitAt === "string" || raw.lastCommitAt == null ? raw.lastCommitAt : undefined;
  if (raw.lastCommitAt != null && lastCommitAt === undefined) {
    return null;
  }
  const baseRef = typeof raw.baseRef === "string" || raw.baseRef == null ? raw.baseRef : undefined;
  if (raw.baseRef != null && baseRef === undefined) {
    return null;
  }
  const aheadCount = typeof raw.aheadCount === "number" || raw.aheadCount == null ? raw.aheadCount : undefined;
  if (raw.aheadCount != null && aheadCount === undefined) {
    return null;
  }
  const behindCount = typeof raw.behindCount === "number" || raw.behindCount == null ? raw.behindCount : undefined;
  if (raw.behindCount != null && behindCount === undefined) {
    return null;
  }
  return {
    titleEntries,
    mergeStatus,
    mergeStatusError,
    lastCommitAt,
    baseRef,
    aheadCount,
    behindCount,
  };
}

/**
 * 文字列キーの辞書を正規化する
 */
function normalizeRecord<T>(value: unknown, normalizeValue: (entry: unknown) => T | null): Record<string, T> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, T> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    const normalized = normalizeValue(entryValue);
    if (normalized == null) {
      return null;
    }
    result[key] = normalized;
  }
  return result;
}

/**
 * null 許容文字列辞書を正規化する
 */
function normalizeNullableStringRecord(value: unknown): Record<string, string | null> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, string | null> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string" && entryValue != null) {
      return null;
    }
    result[key] = entryValue ?? null;
  }
  return result;
}

/**
 * 起動アプリ値を復元可能な形式へ正規化する
 */
function normalizeOpenAppMetaRecord(value: unknown): Record<string, WorktreeOpenAppMeta> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, WorktreeOpenAppMeta> = {};
  for (const [rawPath, rawMeta] of Object.entries(value)) {
    const path = rawPath.trim();
    if (path.length === 0 || rawMeta == null || typeof rawMeta !== "object" || Array.isArray(rawMeta)) {
      return null;
    }
    const entry = rawMeta as Record<string, unknown>;
    const openApp = worktreeOpenAppService.normalizeOpenApp(entry.openApp);
    const threadId = worktreeOpenAppService.normalizeThreadId(entry.threadId);
    if (openApp == null) {
      return null;
    }
    result[path] = { openApp, threadId };
  }
  return result;
}

/**
 * 表示キャッシュ全体を正規化する
 */
export function normalizeWorktreeDeckDisplayCache(value: unknown): WorktreeDeckDisplayCache | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (raw.version !== WORKTREE_DECK_DISPLAY_CACHE_VERSION) {
    return null;
  }
  const worktreesByPath = normalizeRecord(raw.worktreesByPath, normalizeDisplayCacheEntry);
  const titlesByPath = normalizeRecord(raw.titlesByPath, normalizeTitleEntries);
  const originLastCommitByPath = normalizeNullableStringRecord(raw.originLastCommitByPath);
  const originBranchByPath = normalizeNullableStringRecord(raw.originBranchByPath);
  const openAppMetaByPath = normalizeOpenAppMetaRecord(raw.openAppMetaByPath);
  if (
    worktreesByPath == null ||
    titlesByPath == null ||
    originLastCommitByPath == null ||
    originBranchByPath == null ||
    openAppMetaByPath == null
  ) {
    return null;
  }
  return {
    version: WORKTREE_DECK_DISPLAY_CACHE_VERSION,
    worktreesByPath,
    titlesByPath,
    originLastCommitByPath,
    originBranchByPath,
    openAppMetaByPath,
  };
}

/**
 * 保存対象の worktree 詳細があるか判定する
 */
function hasDisplayCacheEntryData(entry: WorktreeDeckDisplayCacheEntry): boolean {
  return (
    (entry.titleEntries?.length ?? 0) > 0 ||
    entry.mergeStatus != null ||
    entry.mergeStatusError != null ||
    entry.lastCommitAt != null ||
    entry.baseRef != null ||
    entry.aheadCount != null ||
    entry.behindCount != null
  );
}

/**
 * 表示キャッシュに保存すべきデータがあるか判定する
 */
export function hasWorktreeDeckDisplayCacheData(cache: WorktreeDeckDisplayCache): boolean {
  if (Object.keys(cache.worktreesByPath).length > 0) {
    return true;
  }
  if (Object.keys(cache.titlesByPath).length > 0) {
    return true;
  }
  if (Object.keys(cache.originLastCommitByPath).length > 0) {
    return true;
  }
  if (Object.keys(cache.originBranchByPath).length > 0) {
    return true;
  }
  if (Object.keys(cache.openAppMetaByPath).length > 0) {
    return true;
  }
  return false;
}

/**
 * 表示中 state から保存用キャッシュを構築する
 */
export function buildWorktreeDeckDisplayCache(args: {
  worktrees: Worktree[];
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  openAppMetaByPath: Map<string, WorktreeOpenAppMeta>;
}): WorktreeDeckDisplayCache {
  const worktreesByPath: Record<string, WorktreeDeckDisplayCacheEntry> = {};
  const sortedWorktrees = [...args.worktrees].sort((left, right) => left.path.localeCompare(right.path));
  for (const item of sortedWorktrees) {
    const entry: WorktreeDeckDisplayCacheEntry = {
      titleEntries: cloneTitles(item.titleEntries),
      mergeStatus: item.mergeStatus,
      mergeStatusError: item.mergeStatusError,
      lastCommitAt: item.lastCommitAt,
      baseRef: item.baseRef,
      aheadCount: item.aheadCount,
      behindCount: item.behindCount,
    };
    if (!hasDisplayCacheEntryData(entry)) {
      continue;
    }
    worktreesByPath[item.path] = entry;
  }

  const titlesByPath: Record<string, WorktreeTitle[]> = {};
  for (const path of Array.from(args.titlesByPath.keys()).sort((left, right) => left.localeCompare(right))) {
    const entries = args.titlesByPath.get(path) ?? [];
    if (entries.length === 0) {
      continue;
    }
    titlesByPath[path] = cloneTitles(entries) ?? [];
  }

  const originLastCommitByPath: Record<string, string | null> = {};
  for (const path of Array.from(args.originLastCommitByPath.keys()).sort((left, right) => left.localeCompare(right))) {
    originLastCommitByPath[path] = args.originLastCommitByPath.get(path) ?? null;
  }

  const originBranchByPath: Record<string, string | null> = {};
  for (const path of Array.from(args.originBranchByPath.keys()).sort((left, right) => left.localeCompare(right))) {
    originBranchByPath[path] = args.originBranchByPath.get(path) ?? null;
  }

  const openAppMetaByPath: Record<string, WorktreeOpenAppMeta> = {};
  for (const path of Array.from(args.openAppMetaByPath.keys()).sort((left, right) => left.localeCompare(right))) {
    const meta = args.openAppMetaByPath.get(path);
    if (!meta) {
      continue;
    }
    openAppMetaByPath[path] = { openApp: meta.openApp, threadId: meta.threadId };
  }

  return {
    version: WORKTREE_DECK_DISPLAY_CACHE_VERSION,
    worktreesByPath,
    titlesByPath,
    originLastCommitByPath,
    originBranchByPath,
    openAppMetaByPath,
  };
}

/**
 * 適用対象の origin パス一覧を作る
 */
function collectOriginPaths(worktrees: Worktree[], mappings: RepositoryMapping[]): Set<string> {
  const paths = new Set<string>();
  for (const item of worktrees) {
    if (item.originPath != null && item.originPath.length > 0) {
      paths.add(item.originPath);
    }
  }
  for (const mapping of mappings) {
    if (mapping.repoRoot != null && mapping.repoRoot.length > 0) {
      paths.add(mapping.repoRoot);
    }
  }
  return paths;
}

/**
 * 表示キャッシュを起動直後の state へ適用する
 */
export function applyWorktreeDeckDisplayCache(args: {
  worktrees: Worktree[];
  mappings: RepositoryMapping[];
  cache: unknown;
}): AppliedWorktreeDeckDisplayCache {
  const normalized = normalizeWorktreeDeckDisplayCache(args.cache);
  if (normalized == null) {
    return {
      worktrees: args.worktrees,
      titlesByPath: new Map(),
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      openAppMetaByPath: new Map(),
    };
  }

  const worktrees = args.worktrees.map((item) => {
    const cached = normalized.worktreesByPath[item.path];
    if (cached === undefined) {
      return item;
    }
    return {
      ...item,
      titleEntries: cloneTitles(cached.titleEntries) ?? item.titleEntries,
      mergeStatus: cached.mergeStatus ?? item.mergeStatus,
      mergeStatusError: cached.mergeStatusError ?? item.mergeStatusError,
      lastCommitAt: cached.lastCommitAt ?? item.lastCommitAt,
      baseRef: cached.baseRef ?? item.baseRef,
      aheadCount: cached.aheadCount ?? item.aheadCount,
      behindCount: cached.behindCount ?? item.behindCount,
    };
  });

  const originPaths = collectOriginPaths(args.worktrees, args.mappings);
  const allowedTitlePaths = new Set<string>();
  for (const item of args.worktrees) {
    allowedTitlePaths.add(item.path);
    if (item.originPath != null && item.originPath.length > 0) {
      allowedTitlePaths.add(item.originPath);
    }
  }
  for (const originPath of originPaths) {
    allowedTitlePaths.add(originPath);
  }

  const titlesByPath = new Map<string, WorktreeTitle[]>();
  for (const path of Array.from(allowedTitlePaths).sort((left, right) => left.localeCompare(right))) {
    const entries = normalized.titlesByPath[path];
    if (entries === undefined || entries.length === 0) {
      continue;
    }
    titlesByPath.set(path, cloneTitles(entries) ?? []);
  }

  const originLastCommitByPath = new Map<string, string | null>();
  for (const path of Array.from(originPaths).sort((left, right) => left.localeCompare(right))) {
    if (!(path in normalized.originLastCommitByPath)) {
      continue;
    }
    originLastCommitByPath.set(path, normalized.originLastCommitByPath[path] ?? null);
  }

  const originBranchByPath = new Map<string, string | null>();
  for (const path of Array.from(originPaths).sort((left, right) => left.localeCompare(right))) {
    if (!(path in normalized.originBranchByPath)) {
      continue;
    }
    originBranchByPath.set(path, normalized.originBranchByPath[path] ?? null);
  }

  const allowedOpenAppPaths = new Set<string>(allowedTitlePaths);
  const openAppMetaByPath = new Map<string, WorktreeOpenAppMeta>();
  for (const path of Array.from(allowedOpenAppPaths).sort((left, right) => left.localeCompare(right))) {
    const meta = normalized.openAppMetaByPath[path];
    if (meta === undefined) {
      continue;
    }
    openAppMetaByPath.set(path, { ...meta });
  }

  return {
    worktrees,
    titlesByPath,
    originLastCommitByPath,
    originBranchByPath,
    openAppMetaByPath,
  };
}

/**
 * 表示キャッシュ同士の差分有無を判定する
 */
export function isSameWorktreeDeckDisplayCache(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeWorktreeDeckDisplayCache(left);
  const normalizedRight = normalizeWorktreeDeckDisplayCache(right);
  if (normalizedLeft == null || normalizedRight == null) {
    return normalizedLeft === normalizedRight;
  }
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}
