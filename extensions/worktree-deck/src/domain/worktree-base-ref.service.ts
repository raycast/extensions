/**
 * baseRef 保存元の種別
 */
export type BaseRefSource = "branch-config" | "worktree-storage";

/**
 * ブランチ設定キー接頭辞
 */
const BASE_BRANCH_CONFIG_PREFIX = "branch";

/**
 * git config サブセクション用にブランチ名をエスケープする
 */
function escapeBranchForGitConfig(branch: string): string {
  return branch.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * ブランチ設定キーを組み立てる
 */
function buildConfigKey(branch: string): string {
  const normalizedBranch = branch.trim();
  const escaped = escapeBranchForGitConfig(normalizedBranch);
  return `${BASE_BRANCH_CONFIG_PREFIX}."${escaped}".worktreeDeckBaseRef`;
}

/**
 * baseRef の候補から優先値を選ぶ
 */
function resolvePreferred(args: { branchConfigBaseRef: string | null; worktreeBaseRef: string | null }): {
  baseRef: string | null;
  source: BaseRefSource | null;
} {
  const branchConfigBaseRef = args.branchConfigBaseRef?.trim() ?? "";
  if (branchConfigBaseRef) {
    return {
      baseRef: branchConfigBaseRef,
      source: "branch-config",
    };
  }
  const worktreeBaseRef = args.worktreeBaseRef?.trim() ?? "";
  if (worktreeBaseRef) {
    return {
      baseRef: worktreeBaseRef,
      source: "worktree-storage",
    };
  }
  return {
    baseRef: null,
    source: null,
  };
}

/**
 * storage 保存値を正規化する
 */
function normalizeStorage(value: unknown): Record<string, { baseRef: string }> {
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
  const result: Record<string, { baseRef: string }> = {};
  for (const [rawPath, entry] of Object.entries(record)) {
    const path = rawPath.trim();
    if (!path) {
      continue;
    }
    let baseRef = "";
    if (typeof entry === "string") {
      baseRef = entry.trim();
    } else if (entry !== null && typeof entry === "object") {
      const meta = entry as Record<string, unknown>;
      baseRef = typeof meta.baseRef === "string" ? meta.baseRef.trim() : "";
    }
    if (!baseRef) {
      continue;
    }
    result[path] = { baseRef };
  }
  return result;
}

/**
 * baseRef ドメインサービス関数群
 */
export const worktreeBaseRefService = {
  buildConfigKey,
  resolvePreferred,
  normalizeStorage,
} as const;
