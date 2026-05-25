/**
 * worktree のコミット済み状態
 */
export type WorktreeCommitState = {
  hasCommitted: boolean;
};

/**
 * worktree コミット状態の保存辞書
 */
export type WorktreeCommitStateStorage = Record<string, WorktreeCommitState>;

type WorktreeCommitStateInput = {
  hasCommitted: unknown;
};

/**
 * 保存値を commit 状態へ正規化する
 */
function normalizeEntry(value: unknown): WorktreeCommitState | null {
  if (typeof value === "boolean") {
    return { hasCommitted: value };
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return { hasCommitted: true };
    }
    if (normalized === "false") {
      return { hasCommitted: false };
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    const entry = value as WorktreeCommitStateInput;
    if (typeof entry.hasCommitted === "boolean") {
      return { hasCommitted: entry.hasCommitted };
    }
    if (typeof entry.hasCommitted === "string") {
      return normalizeEntry(entry.hasCommitted);
    }
  }
  return null;
}

/**
 * 保存値を辞書へ正規化する
 */
function normalizeStorage(value: unknown): WorktreeCommitStateStorage {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value === "string") {
    try {
      return normalizeStorage(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  const result: WorktreeCommitStateStorage = {};
  for (const [rawPath, entry] of Object.entries(record)) {
    const path = rawPath.trim();
    if (!path) {
      continue;
    }
    const normalized = normalizeEntry(entry);
    if (normalized === null || normalized.hasCommitted === false) {
      continue;
    }
    result[path] = normalized;
  }
  return result;
}

/**
 * worktree commit 状態ドメインサービス関数群
 */
export const worktreeCommitStateService = {
  normalizeEntry,
  normalizeStorage,
} as const;
