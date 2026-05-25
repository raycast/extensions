/**
 * マージ対象参照からリモート名を解決する
 */
function resolveRemoteNameFromTargetRef(args: { targetRef: string; remotes: string[] }): string | null {
  const targetRef = args.targetRef.trim();
  if (!targetRef || !targetRef.includes("/")) {
    return null;
  }
  const remoteName = targetRef.split("/")[0]?.trim();
  if (!remoteName) {
    return null;
  }
  return args.remotes.includes(remoteName) ? remoteName : null;
}

/**
 * マージ対象参照からローカルブランチ名を解決する
 */
function resolveTargetBranchName(args: { targetRef: string; remoteName: string | null }): string | null {
  const targetRef = args.targetRef.trim();
  if (!targetRef) {
    return null;
  }
  if (args.remoteName === null) {
    return targetRef;
  }
  const prefix = `${args.remoteName}/`;
  if (!targetRef.startsWith(prefix)) {
    return targetRef;
  }
  const branchName = targetRef.slice(prefix.length).trim();
  return branchName || null;
}

/**
 * 追跡ブランチ作成が必要か判定する
 */
function shouldCreateTrackingBranch(args: { remoteName: string | null; targetLocalExists: boolean }): boolean {
  return Boolean(args.remoteName) && !args.targetLocalExists;
}

/**
 * worktree merge ドメインサービス関数群
 */
export const worktreeMergeService = {
  resolveRemoteNameFromTargetRef,
  resolveTargetBranchName,
  shouldCreateTrackingBranch,
} as const;
