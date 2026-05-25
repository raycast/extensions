import type { WorktreeOpenApp } from "../domain/worktree-open-app.service";

/**
 * 削除済み worktree の保存情報
 */
export type DeletedWorktreeEntry = {
  repoRoot: string;
  repoName: string;
  worktreePath: string;
  branch: string;
  baseRef?: string | null;
  mapValue?: string | null;
  openApp?: WorktreeOpenApp | null;
  removedAt: string;
};

/**
 * 削除済み worktree 記録の入力
 */
type RecordDeletedWorktreeInput = {
  repoRoot: string;
  repoName: string;
  worktreePath: string;
  branch?: string | null;
  baseRef?: string | null;
  mapValue?: string | null;
  openApp?: WorktreeOpenApp | null;
  deleteBranch?: boolean;
};

/**
 * 削除済み worktree ユースケースの依存ポート
 */
export type DeletedWorktreeDependencies = {
  loadDeletedWorktrees(): Promise<DeletedWorktreeEntry[]>;
  saveDeletedWorktrees(entries: DeletedWorktreeEntry[]): Promise<void>;
  saveDeletedWorktree(entry: DeletedWorktreeEntry): Promise<void>;
  deleteDeletedWorktree(args: { repoRoot: string; branch: string }): Promise<void>;
  checkLocalBranchExists(args: { repoRoot: string; branch: string }): Promise<boolean>;
};

/**
 * 削除済み worktree 履歴の保存期間ミリ秒
 */
const DELETED_WORKTREE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 文字列を trim し空文字を null にする
 */
function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
}

/**
 * 復元できる可能性がある削除履歴を保存する
 */
async function recordDeletedWorktree(args: {
  input: RecordDeletedWorktreeInput;
  dependencies: DeletedWorktreeDependencies;
  now?: () => Date;
}): Promise<void> {
  if (args.input.deleteBranch === true) {
    return;
  }
  const branch = normalizeOptionalText(args.input.branch);
  if (branch === null) {
    return;
  }
  const repoRoot = normalizeOptionalText(args.input.repoRoot);
  const repoName = normalizeOptionalText(args.input.repoName);
  const worktreePath = normalizeOptionalText(args.input.worktreePath);
  if (repoRoot === null || repoName === null || worktreePath === null) {
    return;
  }
  await args.dependencies.saveDeletedWorktree({
    repoRoot,
    repoName,
    worktreePath,
    branch,
    baseRef: normalizeOptionalText(args.input.baseRef),
    mapValue: normalizeOptionalText(args.input.mapValue),
    openApp: args.input.openApp ?? null,
    removedAt: (args.now?.() ?? new Date()).toISOString(),
  });
}

/**
 * 削除履歴を新しい順に並べる
 */
function sortDeletedWorktreesByRemovedAtDesc(entries: DeletedWorktreeEntry[]): DeletedWorktreeEntry[] {
  return [...entries].sort((left, right) => {
    return Date.parse(right.removedAt) - Date.parse(left.removedAt);
  });
}

/**
 * 同一 repoRoot/branch の削除履歴を最新だけに絞る
 */
function dedupeDeletedWorktreesByBranch(entries: DeletedWorktreeEntry[]): DeletedWorktreeEntry[] {
  const results: DeletedWorktreeEntry[] = [];
  const seen = new Set<string>();
  for (const entry of sortDeletedWorktreesByRemovedAtDesc(entries)) {
    const repoRoot = normalizeOptionalText(entry.repoRoot);
    const branch = normalizeOptionalText(entry.branch);
    if (repoRoot === null || branch === null) {
      continue;
    }
    const key = `${repoRoot}\n${branch}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push({
      ...entry,
      repoRoot,
      branch,
    });
  }
  return results;
}

/**
 * 保存期間を過ぎていない削除履歴だけを返す
 */
function filterRetainedDeletedWorktrees(entries: DeletedWorktreeEntry[], now: Date): DeletedWorktreeEntry[] {
  const cutoffTime = now.getTime() - DELETED_WORKTREE_RETENTION_MS;
  return entries.filter((entry) => {
    const removedAtTime = Date.parse(entry.removedAt);
    return Number.isFinite(removedAtTime) && removedAtTime > cutoffTime;
  });
}

/**
 * 保存期間切れの削除履歴を storage から削除する
 */
async function pruneExpiredDeletedWorktrees(args: {
  entries: DeletedWorktreeEntry[];
  dependencies: DeletedWorktreeDependencies;
  now: Date;
}): Promise<DeletedWorktreeEntry[]> {
  const retained = filterRetainedDeletedWorktrees(args.entries, args.now);
  if (retained.length !== args.entries.length) {
    await args.dependencies.saveDeletedWorktrees(retained);
  }
  return retained;
}

/**
 * ローカルブランチが残っている削除済み worktree だけを返す
 */
async function listRestorableDeletedWorktrees(args: {
  dependencies: DeletedWorktreeDependencies;
  now?: () => Date;
}): Promise<DeletedWorktreeEntry[]> {
  const retained = await pruneExpiredDeletedWorktrees({
    entries: await args.dependencies.loadDeletedWorktrees(),
    dependencies: args.dependencies,
    now: args.now?.() ?? new Date(),
  });
  const entries = dedupeDeletedWorktreesByBranch(retained);
  const results: DeletedWorktreeEntry[] = [];
  for (const entry of entries) {
    const exists = await args.dependencies.checkLocalBranchExists({
      repoRoot: entry.repoRoot,
      branch: entry.branch,
    });
    if (exists) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * 復元済みまたは不要になった削除履歴を削除する
 */
async function forgetDeletedWorktree(args: {
  input: { repoRoot: string; branch: string };
  dependencies: DeletedWorktreeDependencies;
}): Promise<void> {
  const repoRoot = normalizeOptionalText(args.input.repoRoot);
  const branch = normalizeOptionalText(args.input.branch);
  if (repoRoot === null || branch === null) {
    return;
  }
  await args.dependencies.deleteDeletedWorktree({ repoRoot, branch });
}

/**
 * 削除済み worktree ユースケース関数群
 */
export const deletedWorktreesUsecase = {
  forgetDeletedWorktree,
  listRestorableDeletedWorktrees,
  recordDeletedWorktree,
} as const;
