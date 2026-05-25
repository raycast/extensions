import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DeletedWorktreeEntry } from "../application/deleted-worktrees.usecase";
import { worktreeOpenAppService } from "../domain/worktree-open-app.service";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { isMissingExternalCommandError, normalizeExternalCommandError } from "./external-command-error";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";

const execFileAsync = promisify(execFile);

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";

/**
 * 削除済み worktree storage のファイル名
 */
const DELETED_WORKTREES_STORAGE_FILE = "deleted-worktrees.json";

/**
 * 削除済み worktree 履歴の最大保存件数
 */
const MAX_DELETED_WORKTREE_ENTRIES = 50;

/**
 * 削除済み worktree 用の storage 引数を組み立てる
 */
function buildDeletedWorktreeStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * 文字列を trim し空文字を null にする
 */
function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * storage の1要素を削除済み worktree 情報へ正規化する
 */
function normalizeDeletedWorktreeEntry(value: unknown): DeletedWorktreeEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  const repoRoot = normalizeOptionalText(payload.repoRoot);
  const repoName = normalizeOptionalText(payload.repoName);
  const worktreePath = normalizeOptionalText(payload.worktreePath);
  const branch = normalizeOptionalText(payload.branch);
  const removedAt = normalizeOptionalText(payload.removedAt);
  if (!repoRoot || !repoName || !worktreePath || !branch || !removedAt) {
    return null;
  }
  return {
    repoRoot,
    repoName,
    worktreePath,
    branch,
    baseRef: normalizeOptionalText(payload.baseRef),
    mapValue: normalizeOptionalText(payload.mapValue),
    openApp: worktreeOpenAppService.normalizeOpenApp(payload.openApp) ?? null,
    removedAt,
  };
}

/**
 * storage 値を削除済み worktree 配列へ正規化する
 */
function normalizeDeletedWorktreeStorage(value: unknown): DeletedWorktreeEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeDeletedWorktreeEntry(entry))
    .filter((entry): entry is DeletedWorktreeEntry => entry !== null);
}

/**
 * 削除済み worktree の重複判定キーを返す
 */
function buildDeletedWorktreeEntryKey(entry: DeletedWorktreeEntry): string {
  return `${entry.repoRoot}\n${entry.branch}`;
}

/**
 * 削除済み worktree 履歴を読み込む
 */
export async function loadDeletedWorktrees(): Promise<DeletedWorktreeEntry[]> {
  try {
    const stored = await readWorktreeDeckFileStorageJson<unknown>(
      buildDeletedWorktreeStorageArgs(),
      DELETED_WORKTREES_STORAGE_FILE,
    );
    return normalizeDeletedWorktreeStorage(stored);
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 壊れた保存ファイルは次回保存で上書き復旧する
      return [];
    }
    throw error;
  }
}

/**
 * 削除済み worktree 履歴一覧を保存する
 */
export async function saveDeletedWorktrees(entries: DeletedWorktreeEntry[]): Promise<void> {
  await writeWorktreeDeckFileStorageJson(
    buildDeletedWorktreeStorageArgs(),
    DELETED_WORKTREES_STORAGE_FILE,
    entries.slice(0, MAX_DELETED_WORKTREE_ENTRIES),
  );
}

/**
 * 削除済み worktree 履歴を先頭に保存する
 */
export async function saveDeletedWorktree(entry: DeletedWorktreeEntry): Promise<void> {
  const current = await loadDeletedWorktrees();
  const nextEntryKey = buildDeletedWorktreeEntryKey(entry);
  const next = [
    entry,
    ...current.filter((currentEntry) => buildDeletedWorktreeEntryKey(currentEntry) !== nextEntryKey),
  ];
  await saveDeletedWorktrees(next);
}

/**
 * 削除済み worktree 履歴を repoRoot と branch で削除する
 */
export async function deleteDeletedWorktree(args: { repoRoot: string; branch: string }): Promise<void> {
  const current = await loadDeletedWorktrees();
  const deleteKey = `${args.repoRoot}\n${args.branch}`;
  const next = current.filter((entry) => buildDeletedWorktreeEntryKey(entry) !== deleteKey);
  await writeWorktreeDeckFileStorageJson(buildDeletedWorktreeStorageArgs(), DELETED_WORKTREES_STORAGE_FILE, next);
}

/**
 * 削除済み worktree のローカルブランチが残っているか判定する
 */
export async function checkDeletedWorktreeLocalBranchExists(args: {
  repoRoot: string;
  branch: string;
}): Promise<boolean> {
  try {
    await execGit(args.repoRoot, ["show-ref", "--verify", `refs/heads/${args.branch}`]);
    return true;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return false;
  }
}

/**
 * git コマンドを対象リポジトリで実行する
 */
async function execGit(repoRoot: string, gitArgs: string[]): Promise<void> {
  try {
    await execFileAsync("git", ["-C", repoRoot, ...gitArgs], { cwd: repoRoot });
  } catch (error) {
    throw normalizeExternalCommandError(error, "git", "git-worktree");
  }
}
