import {
  worktreeOpenAppService,
  type WorktreeOpenApp,
  type WorktreeOpenAppMeta,
  type WorktreeOpenAppStorage,
} from "../domain/worktree-open-app.service";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";
import { openCodexThreadInApp, openPathInCodexApp } from "./codex-app-infra";
import { openPathInConfiguredIde } from "./worktree-ide-app-store";

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";

/**
 * 起動アプリ設定の storage ファイル名
 */
const WORKTREE_OPEN_APP_STORAGE_FILE = "worktree-open-app.json";

/**
 * 指定アプリで worktree を開いた結果
 */
type OpenPathInPreferredAppResult = {
  preferenceSaved: boolean;
  savedMeta: WorktreeOpenAppMeta | null;
};

/**
 * 起動アプリ用の storage 引数を組み立てる
 */
function buildWorktreeOpenAppStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * storage から起動アプリ設定を読み込む
 */
async function loadWorktreeOpenAppStorage(): Promise<WorktreeOpenAppStorage> {
  try {
    const stored = await readWorktreeDeckFileStorageJson<unknown>(
      buildWorktreeOpenAppStorageArgs(),
      WORKTREE_OPEN_APP_STORAGE_FILE,
    );
    return worktreeOpenAppService.normalizeStorage(stored ?? "");
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 壊れた保存ファイルは次回保存で上書き復旧する
      return {};
    }
    throw error;
  }
}

/**
 * 起動アプリ設定を storage へ保存する
 */
async function saveWorktreeOpenAppStorage(storage: WorktreeOpenAppStorage): Promise<void> {
  await writeWorktreeDeckFileStorageJson(buildWorktreeOpenAppStorageArgs(), WORKTREE_OPEN_APP_STORAGE_FILE, storage);
}

/**
 * worktree パスごとの起動アプリ設定をまとめて取得する
 */
export async function loadOpenAppMetaByWorktreePath(paths: string[]): Promise<Map<string, WorktreeOpenAppMeta>> {
  const normalizedPaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));
  if (normalizedPaths.length === 0) {
    return new Map();
  }
  const storage = await loadWorktreeOpenAppStorage();
  const entries = normalizedPaths
    .map((path) => {
      const meta = storage[path];
      return meta ? ([path, meta] as const) : null;
    })
    .filter((entry): entry is readonly [string, WorktreeOpenAppMeta] => entry !== null);
  return new Map(entries);
}

/**
 * worktree パスに起動アプリを保存する
 */
export async function saveOpenAppForWorktreePath(path: string, openApp: WorktreeOpenApp): Promise<void> {
  const worktreePath = path.trim();
  const normalizedOpenApp = worktreeOpenAppService.normalizeOpenApp(openApp);
  if (!worktreePath || !normalizedOpenApp) {
    return;
  }
  const storage = await loadWorktreeOpenAppStorage();
  const storedThreadId = storage[worktreePath]?.threadId ?? null;
  await saveWorktreeOpenAppStorage({
    ...storage,
    [worktreePath]: { openApp: normalizedOpenApp, threadId: storedThreadId },
  });
}

/**
 * worktree パスに Codex thread id を保存する
 */
export async function saveCodexThreadIdForWorktreePath(path: string, threadId: string): Promise<void> {
  const worktreePath = path.trim();
  const normalizedThreadId = worktreeOpenAppService.normalizeThreadId(threadId);
  if (!worktreePath || !normalizedThreadId) {
    return;
  }
  const storage = await loadWorktreeOpenAppStorage();
  await saveWorktreeOpenAppStorage({
    ...storage,
    [worktreePath]: { openApp: "codex-app", threadId: normalizedThreadId },
  });
}

/**
 * worktree パスに起動アプリと必要な thread id を保存する
 */
export async function saveOpenAppMetaForWorktreePath(
  path: string,
  openApp: WorktreeOpenApp,
  threadId?: string | null,
): Promise<WorktreeOpenAppMeta | null> {
  const worktreePath = path.trim();
  const normalizedOpenApp = worktreeOpenAppService.normalizeOpenApp(openApp);
  if (!worktreePath || !normalizedOpenApp) {
    return null;
  }
  const storage = await loadWorktreeOpenAppStorage();
  const storedThreadId = storage[worktreePath]?.threadId ?? null;
  const nextThreadId = threadId === undefined ? storedThreadId : worktreeOpenAppService.normalizeThreadId(threadId);
  const nextMeta = { openApp: normalizedOpenApp, threadId: nextThreadId };
  await saveWorktreeOpenAppStorage({
    ...storage,
    [worktreePath]: nextMeta,
  });
  return nextMeta;
}

/**
 * 起動アプリ保存を非致命扱いで試みる
 */
async function trySaveOpenAppMetaForWorktreePath(
  path: string,
  openApp: WorktreeOpenApp,
  threadId?: string | null,
): Promise<WorktreeOpenAppMeta | null> {
  try {
    return await saveOpenAppMetaForWorktreePath(path, openApp, threadId);
  } catch {
    // 保存失敗だけで起動操作を止めない
    return null;
  }
}

/**
 * 指定アプリを次回起動先として保存してから worktree を開く
 *
 * Codex App 起動コマンドが完了を返さない場合でも切り替え結果を残すため、
 * 永続化は外部アプリ起動より前に行う。
 */
export async function openPathInPreferredApp(
  path: string,
  openApp: WorktreeOpenApp,
  threadId?: string | null,
): Promise<OpenPathInPreferredAppResult> {
  const worktreePath = path.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const resolvedOpenApp = worktreeOpenAppService.resolvePreferred(openApp);
  if (resolvedOpenApp === "codex-app") {
    const normalizedThreadId = worktreeOpenAppService.normalizeThreadId(threadId);
    if (normalizedThreadId) {
      const savedMeta = await trySaveOpenAppMetaForWorktreePath(worktreePath, resolvedOpenApp, normalizedThreadId);
      await openCodexThreadInApp(normalizedThreadId);
      return { preferenceSaved: savedMeta !== null, savedMeta };
    }
    const savedMeta = await trySaveOpenAppMetaForWorktreePath(worktreePath, resolvedOpenApp, null);
    await openPathInCodexApp(worktreePath);
    return { preferenceSaved: savedMeta !== null, savedMeta };
  }
  const savedMeta = await trySaveOpenAppMetaForWorktreePath(worktreePath, resolvedOpenApp);
  await openPathInConfiguredIde(worktreePath);
  return { preferenceSaved: savedMeta !== null, savedMeta };
}
