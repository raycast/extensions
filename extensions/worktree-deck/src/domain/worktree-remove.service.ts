/**
 * 削除対象として扱うブランチ名を正規化する
 */
function normalizeBranchName(branch: string | null | undefined): string | null {
  const trimmed = branch === null || branch === undefined ? "" : branch.trim();
  if (trimmed.length === 0 || trimmed === "root") {
    return null;
  }
  return trimmed;
}

/**
 * branch.*.merge の値から削除対象のリモートブランチ名を解決する
 */
function resolveRemoteBranchNameFromMergeRef(args: { mergeRef: string | null; fallbackBranch: string }): string {
  const trimmedMergeRef = args.mergeRef?.trim();
  if (trimmedMergeRef === undefined || trimmedMergeRef.length === 0) {
    return args.fallbackBranch;
  }
  const prefix = "refs/heads/";
  if (trimmedMergeRef.startsWith(prefix)) {
    const branchName = trimmedMergeRef.slice(prefix.length).trim();
    return branchName || args.fallbackBranch;
  }
  return trimmedMergeRef;
}

/**
 * 削除対象のリモート名を候補から選択する
 */
function selectRemoteNameForDeletion(args: { remotes: string[]; configuredRemote: string | null }): string | null {
  if (args.remotes.length === 0) {
    return null;
  }
  if (args.configuredRemote !== null && args.remotes.includes(args.configuredRemote)) {
    return args.configuredRemote;
  }
  if (args.remotes.includes("origin")) {
    return "origin";
  }
  return args.remotes[0] ?? null;
}

/**
 * worktree 削除ドメインサービス関数群
 */
export const worktreeRemoveService = {
  normalizeBranchName,
  resolveRemoteBranchNameFromMergeRef,
  selectRemoteNameForDeletion,
} as const;
