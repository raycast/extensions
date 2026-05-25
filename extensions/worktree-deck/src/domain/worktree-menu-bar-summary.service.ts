import type { WorktreeMenuBarStatusSummary } from "./worktree-menu-bar-status.service";

/**
 * メニューバー状態の読み込み結果
 */
export type WorktreeMenuBarSummarySnapshot = {
  summary: WorktreeMenuBarStatusSummary;
  total: number;
};

/**
 * 保存済みメニューバー状態を型安全に正規化する
 */
function normalizeStoredSummary(raw: unknown): WorktreeMenuBarSummarySnapshot | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const summary = value.summary;
  const total = value.total;
  if (summary === null || typeof summary !== "object" || Array.isArray(summary) || typeof total !== "number") {
    return null;
  }
  const summaryValue = summary as Record<string, unknown>;
  const blue = summaryValue.blue;
  const green = summaryValue.green;
  const yellow = summaryValue.yellow;
  if (typeof blue !== "number" || typeof green !== "number" || typeof yellow !== "number") {
    return null;
  }
  return {
    summary: { blue, green, yellow },
    total,
  };
}

/**
 * worktree status メニューバー summary の関数群
 */
export const worktreeMenuBarSummaryService = {
  normalizeStoredSummary,
} as const;
