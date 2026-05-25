/**
 * ブランチ名入力を正規化する
 */
function normalizeBranchName(branch: string | null | undefined): string | null {
  const trimmed = branch?.trim() ?? "";
  if (trimmed.length === 0 || trimmed === "root") {
    return null;
  }
  return trimmed;
}

/**
 * 変更対象のリモート名を候補から選択する
 */
function selectRemoteNameForRename(args: { remotes: string[]; configuredRemote: string | null }): string | null {
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
 * ブランチ名変更ドメインサービス関数群
 */
export const worktreeRenameService = {
  normalizeBranchName,
  selectRemoteNameForRename,
} as const;
