/**
 * PR ヘッドブランチ名を正規化する
 */
function normalizeHeadBranch(branch: string | null | undefined): string | null {
  const trimmed = branch === null || branch === undefined ? "" : branch.trim();
  if (trimmed.length === 0 || trimmed === "root") {
    return null;
  }
  return trimmed;
}

/**
 * ベース参照からリモート名を解決する
 */
function resolveRemoteNameFromBaseRef(args: { baseRef: string; remotes: string[] }): string | null {
  const baseRef = args.baseRef.trim();
  if (!baseRef || !baseRef.includes("/")) {
    return null;
  }
  const remoteName = baseRef.split("/")[0]?.trim();
  if (!remoteName) {
    return null;
  }
  return args.remotes.includes(remoteName) ? remoteName : null;
}

/**
 * ベース参照からローカルベースブランチ名を解決する
 */
function resolveBaseBranchName(args: { baseRef: string; remoteName: string | null }): string | null {
  const baseRef = args.baseRef.trim();
  if (!baseRef) {
    return null;
  }
  if (args.remoteName === null) {
    return baseRef;
  }
  const prefix = `${args.remoteName}/`;
  if (!baseRef.startsWith(prefix)) {
    return baseRef;
  }
  const branchName = baseRef.slice(prefix.length).trim();
  return branchName || null;
}

/**
 * worktree pull request ドメインサービス関数群
 */
export const worktreePullRequestService = {
  normalizeHeadBranch,
  resolveRemoteNameFromBaseRef,
  resolveBaseBranchName,
} as const;
