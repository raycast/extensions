import type { WorktreeMergeStatus } from "../composition-root";

/**
 * ブランチ選択肢を表すデータ
 */
export type BranchOption = {
  value: string;
  title: string;
};

/**
 * ブランチ選択肢を生成する
 */
export function buildBranchOptions(branches: string[]): BranchOption[] {
  return branches.map((branch) => ({ value: branch, title: branch }));
}

/**
 * 実行エラーから表示用メッセージを抽出する
 */
export function formatExecErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const payload = error as { stderr?: string; stdout?: string; message?: string; code?: number };
    const stderr = payload.stderr?.trim();
    if (stderr) {
      return stderr;
    }
    const stdout = payload.stdout?.trim();
    if (stdout) {
      return stdout;
    }
    if (payload.message) {
      return payload.message;
    }
    if (typeof payload.code === "number") {
      return `Command failed with exit code ${payload.code}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Command failed.";
}

/**
 * マージ状態の短い表示を作る
 */
export function formatMergeStatusLabel(status: WorktreeMergeStatus | "unknown"): string {
  switch (status) {
    case "synced":
      return "synced";
    case "no-commit":
      return "no commit";
    case "unmerged":
      return "not synced";
    case "dirty":
      return "dirty";
    default:
      return "unknown";
  }
}

/**
 * 1行メタ情報のマージ状態表示を作る
 */
function formatMergeStatusMetaLabel(status: WorktreeMergeStatus | "unknown"): string {
  const label = formatMergeStatusLabel(status);
  switch (status) {
    case "synced":
      return `✅ ${label}`;
    case "no-commit":
      return `🆕 ${label}`;
    case "unmerged":
      return `🔀 ${label}`;
    case "dirty":
      return `⚠️ ${label}`;
    default:
      return `❔ ${label}`;
  }
}

/**
 * worktree 詳細の1行メタ情報を組み立てる
 */
export function formatWorktreeMetaLine(args: {
  baseRef?: string | null;
  mergeStatus?: WorktreeMergeStatus | "unknown" | null;
}): string | null {
  const parts: string[] = [];
  const baseRefText = args.baseRef?.trim();
  if (baseRefText) {
    parts.push(`🌿 ${baseRefText}`);
  }
  if (args.mergeStatus != null) {
    parts.push(formatMergeStatusMetaLabel(args.mergeStatus));
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join("  ");
}

/**
 * 最終コミット日時の表示文字列を作る
 */
export function formatLastCommitAt(lastCommitAt?: string | null, useSeparator: boolean = true): string {
  const prefix = useSeparator ? "| " : "";
  if (!lastCommitAt) {
    return `${prefix}Commit: Unknown`;
  }
  return `${prefix}Commit: ${lastCommitAt}`;
}

/**
 * 削除対象ブランチ名を正規化する
 */
export function normalizeWorktreeBranchName(branch?: string | null): string | null {
  const trimmed = branch?.trim();
  if (!trimmed || trimmed === "root") {
    return null;
  }
  return trimmed;
}

/**
 * pull 対象として扱えるブランチか判定する
 */
export function canPullBranch(branch?: string | null): boolean {
  return Boolean(normalizeWorktreeBranchName(branch));
}
