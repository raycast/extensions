import {
  sessionTitleService,
  type ExplicitSessionTitle,
  type ExplicitSessionTitleStorage,
} from "../domain/session-title.service";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";

/**
 * 明示セッションタイトルの storage ファイル名
 */
const WORKTREE_SESSION_TITLE_STORAGE_FILE = "worktree-session-titles.json";

/**
 * 明示セッションタイトル用の storage 引数を組み立てる
 */
function buildWorktreeSessionTitleStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * storage から明示セッションタイトルを読み込む
 */
async function loadWorktreeSessionTitleStorage(args: EnvLookupArgs): Promise<ExplicitSessionTitleStorage> {
  try {
    const stored = await readWorktreeDeckFileStorageJson<unknown>(args, WORKTREE_SESSION_TITLE_STORAGE_FILE);
    return sessionTitleService.normalizeStorage(stored ?? "");
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 壊れた保存ファイルは次回保存で上書き復旧する
      return {};
    }
    throw error;
  }
}

/**
 * storage へ明示セッションタイトルを保存する
 */
async function saveWorktreeSessionTitleStorage(
  args: EnvLookupArgs,
  storage: ExplicitSessionTitleStorage,
): Promise<void> {
  await writeWorktreeDeckFileStorageJson(args, WORKTREE_SESSION_TITLE_STORAGE_FILE, storage);
}

/**
 * session title store の検索結果
 */
export type ExplicitSessionTitleLookup = {
  byThreadId: Map<string, ExplicitSessionTitle>;
  byWorktreePath: Map<string, ExplicitSessionTitle[]>;
};

/**
 * 指定 worktree 群に関係する明示セッションタイトルを読み込む
 */
export async function loadExplicitSessionTitlesForWorktreePaths(args: {
  paths: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath?: string;
  packageDir: string;
  packageName: string;
}): Promise<ExplicitSessionTitleLookup> {
  const normalizedPaths = new Set(args.paths.map((path) => path.trim()).filter(Boolean));
  if (normalizedPaths.size === 0) {
    return { byThreadId: new Map(), byWorktreePath: new Map() };
  }
  const storage = await loadWorktreeSessionTitleStorage(args);
  const byThreadId = new Map<string, ExplicitSessionTitle>();
  const byWorktreePath = new Map<string, ExplicitSessionTitle[]>();
  for (const entry of Object.values(storage)) {
    if (!normalizedPaths.has(entry.worktreePath)) {
      continue;
    }
    byThreadId.set(entry.threadId, entry);
    const list = byWorktreePath.get(entry.worktreePath);
    if (list) {
      list.push(entry);
    } else {
      byWorktreePath.set(entry.worktreePath, [entry]);
    }
  }
  for (const entries of byWorktreePath.values()) {
    entries.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }
  return { byThreadId, byWorktreePath };
}

/**
 * 明示セッションタイトルを保存する
 */
export async function saveExplicitSessionTitleForThread(args: {
  threadId: string;
  worktreePath: string;
  title: string;
}): Promise<ExplicitSessionTitle | null> {
  const storageArgs = buildWorktreeSessionTitleStorageArgs();
  const storage = await loadWorktreeSessionTitleStorage(storageArgs);
  const threadId = sessionTitleService.normalizeThreadId(args.threadId);
  if (!threadId) {
    return null;
  }
  const now = new Date().toISOString();
  const entry = sessionTitleService.buildEntry({
    threadId,
    worktreePath: args.worktreePath,
    title: args.title,
    now,
    existing: storage[threadId] ?? null,
  });
  if (!entry) {
    return null;
  }
  await saveWorktreeSessionTitleStorage(storageArgs, {
    ...storage,
    [threadId]: entry,
  });
  return entry;
}
