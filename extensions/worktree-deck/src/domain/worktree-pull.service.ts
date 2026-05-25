/**
 * pull 対象ブランチが期待ブランチと一致しているか判定する
 */
function matchesExpectedBranch(args: { expectedBranch: string | null; currentBranch: string }): boolean {
  const expectedBranch = args.expectedBranch?.trim();
  if (expectedBranch === undefined || expectedBranch.length === 0) {
    return true;
  }
  return args.currentBranch.trim() === expectedBranch;
}

/**
 * upstream 参照名を正規化する
 */
function normalizeUpstreamRef(upstreamRef: string | null): string | null {
  const normalized = upstreamRef?.trim();
  return normalized !== undefined && normalized.length > 0 ? normalized : null;
}

/**
 * worktree pull ドメインサービス関数群
 */
export const worktreePullService = {
  matchesExpectedBranch,
  normalizeUpstreamRef,
} as const;
