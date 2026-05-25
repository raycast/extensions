import { basename, dirname, isAbsolute, join, normalize } from "node:path";

import { normalizePathValue } from "../domain/path-utils";
import { loadBaseRefForBranchConfig, loadBaseRefForWorktreePath } from "./worktree-base-ref-store";
import {
  loadWorktreeCommitStateStorage,
  saveWorktreeCommitStateStorage,
  type WorktreeCommitState,
} from "./worktree-commit-state-store";
import { execGit } from "./git-command";
import type { Worktree, WorktreeMergeStatus } from "./worktree-types";

type WorktreeStatusSummary = {
  branch: string | null;
  isClean: boolean;
};

type HeadMergeStatus = {
  isMerged: boolean;
  usedLocalCounterpart: boolean;
  hasBranchProgress: boolean;
};

export async function loadWorktreeMetadata(
  items: Worktree[],
  options?: { baseRefByPath?: Map<string, string> },
): Promise<Worktree[]> {
  let commitStateStorage: Record<string, WorktreeCommitState> = {};
  try {
    commitStateStorage = await loadWorktreeCommitStateStorage();
  } catch {
    commitStateStorage = {};
  }
  let hasCommitStateUpdates = false;
  const nextCommitStateStorage: Record<string, WorktreeCommitState> = { ...commitStateStorage };
  const results = await Promise.all(
    items.map(async (item) => {
      const statusSummary = await readWorktreeStatusSummary(item.path);
      const resolvedBranch = await resolveWorktreeBranchName(item, statusSummary);
      const storedBaseRef = options?.baseRefByPath?.get(item.path) ?? null;
      const commitState = commitStateStorage[item.path] ?? { hasCommitted: false };
      const mergeInfo = await loadWorktreeMergeStatus(item.path, storedBaseRef, commitState, statusSummary);
      if (mergeInfo.commitStateUpdated) {
        nextCommitStateStorage[item.path] = mergeInfo.commitState;
        hasCommitStateUpdates = true;
      }
      return {
        ...item,
        branch: resolvedBranch,
        mergeStatus: mergeInfo.status,
        mergeStatusError: mergeInfo.errorMessage,
        baseRef: mergeInfo.baseRef ?? storedBaseRef,
        lastCommitAt: await loadWorktreeLastCommitAt(item.path),
      };
    }),
  );
  if (hasCommitStateUpdates) {
    try {
      await saveWorktreeCommitStateStorage(nextCommitStateStorage);
    } catch {
      // cache 保存失敗は一覧取得を止めない
    }
  }
  return results;
}

/**
 * 共通 .git から元リポジトリのパスを推定する
 */
export async function resolveOriginRepoPath(worktreePath: string): Promise<string | null> {
  const commonDir = await resolveCommonGitDir(worktreePath);
  if (!commonDir) {
    return null;
  }
  return resolveRepoPathFromCommonGitDir(commonDir);
}

/**
 * git common dir からユーザーが開くべき repo root を解決する
 */
function resolveRepoPathFromCommonGitDir(commonDir: string): string {
  const normalized = normalizePathValue(commonDir);
  if (basename(normalized) === ".git") {
    return dirname(normalized);
  }
  const worktreesDir = dirname(normalized);
  const gitDir = dirname(worktreesDir);
  if (basename(worktreesDir) === "worktrees" && basename(gitDir) === ".git") {
    return dirname(gitDir);
  }
  return normalized;
}

/**
 * worktree のブランチ名を解決する
 */
async function resolveWorktreeBranchName(
  item: Worktree,
  statusSummary?: WorktreeStatusSummary | null,
): Promise<string | undefined> {
  const currentBranch = statusSummary?.branch ?? (await readCurrentBranch(item.path));
  if (currentBranch) {
    return currentBranch;
  }
  const trimmed = item.branch?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

/**
 * status 出力からブランチ名と変更有無を抽出する
 */
function parseWorktreeStatusSummary(output: string): WorktreeStatusSummary {
  let branch: string | null = null;
  let hasChanges = false;
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith("#")) {
      const headPrefix = "# branch.head ";
      if (line.startsWith(headPrefix)) {
        const value = line.slice(headPrefix.length).trim();
        if (value && !value.startsWith("(")) {
          branch = value;
        }
      }
      continue;
    }
    hasChanges = true;
  }
  return { branch, isClean: !hasChanges };
}

/**
 * worktree のブランチ名と変更有無を取得する（未追跡は除外）
 */
async function readWorktreeStatusSummary(worktreePath: string): Promise<WorktreeStatusSummary> {
  try {
    const { stdout } = await execGit(worktreePath, ["status", "--porcelain=2", "-b", "-uno"]);
    return parseWorktreeStatusSummary(stdout);
  } catch {
    return { branch: null, isClean: false };
  }
}

/**
 * git の共通ディレクトリを解決する
 */
async function resolveCommonGitDir(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["rev-parse", "--git-common-dir"]);
    const raw = stdout.trim();
    if (!raw) {
      return null;
    }
    if (isAbsolute(raw)) {
      return raw;
    }
    return normalize(join(worktreePath, raw));
  } catch {
    return null;
  }
}
/**
 * ワークツリーのマージ状態を判定する
 */
async function loadWorktreeMergeStatus(
  worktreePath: string,
  storedBaseRef?: string | null,
  commitState?: WorktreeCommitState | null,
  statusSummary?: WorktreeStatusSummary | null,
): Promise<{
  status: WorktreeMergeStatus;
  errorMessage: string | null;
  commitState: WorktreeCommitState;
  commitStateUpdated: boolean;
  baseRef: string | null;
}> {
  const currentCommitState = commitState ?? { hasCommitted: false };
  let resolvedStoredBaseRef: string | null = null;
  try {
    const isClean = statusSummary ? statusSummary.isClean : await isWorktreeClean(worktreePath);
    if (!isClean) {
      if (storedBaseRef !== undefined) {
        const trimmed = storedBaseRef?.trim();
        resolvedStoredBaseRef = trimmed || null;
      }
      return {
        status: "dirty",
        errorMessage: null,
        commitState: currentCommitState,
        commitStateUpdated: false,
        baseRef: resolvedStoredBaseRef,
      };
    }
    resolvedStoredBaseRef = await resolveStoredBaseRef(worktreePath, storedBaseRef);
    const resolvedBaseRef = resolvedStoredBaseRef ?? (await resolveMergeTargetRef(worktreePath));
    if (!resolvedBaseRef) {
      return {
        status: "unknown",
        errorMessage: "Base branch is not configured. Open Merge Worktree to select a target branch.",
        commitState: currentCommitState,
        commitStateUpdated: false,
        baseRef: null,
      };
    }
    const mergeStatus = await checkHeadMergedIntoBase(worktreePath, resolvedBaseRef, statusSummary?.branch ?? null);
    if (mergeStatus === null) {
      return {
        status: "unknown",
        errorMessage: "Failed to check merge status.",
        commitState: currentCommitState,
        commitStateUpdated: false,
        baseRef: resolvedBaseRef,
      };
    }
    const commitStateResult = updateWorktreeCommitState(
      currentCommitState,
      !mergeStatus.isMerged || mergeStatus.usedLocalCounterpart || mergeStatus.hasBranchProgress,
    );
    const status = mergeStatus.isMerged ? (commitStateResult.state.hasCommitted ? "synced" : "no-commit") : "unmerged";
    return {
      status,
      errorMessage: null,
      commitState: commitStateResult.state,
      commitStateUpdated: commitStateResult.updated,
      baseRef: resolvedBaseRef,
    };
  } catch {
    return {
      status: "unknown",
      errorMessage: "Failed to check merge status.",
      commitState: currentCommitState,
      commitStateUpdated: false,
      baseRef: resolvedStoredBaseRef,
    };
  }
}

/**
 * HEAD が baseRef または同名ローカルブランチへマージ済みか判定する
 */
async function checkHeadMergedIntoBase(
  worktreePath: string,
  baseRef: string,
  currentBranch: string | null,
): Promise<HeadMergeStatus | null> {
  const hasBranchProgress = await hasCurrentBranchProgress(worktreePath, currentBranch);
  const primary = await isHeadMergedInto(worktreePath, baseRef);
  if (primary === true) {
    return { isMerged: true, usedLocalCounterpart: false, hasBranchProgress };
  }

  const localCounterpart = await resolveLocalCounterpartRef(worktreePath, baseRef);
  if (localCounterpart) {
    const local = await isHeadMergedInto(worktreePath, localCounterpart);
    if (local === true) {
      return { isMerged: true, usedLocalCounterpart: true, hasBranchProgress };
    }
    if (local === null && primary === null) {
      return null;
    }
  }

  if (primary === null) {
    return null;
  }
  return { isMerged: false, usedLocalCounterpart: false, hasBranchProgress };
}

/**
 * 現在ブランチに作成時以外の履歴があるか判定する
 */
async function hasCurrentBranchProgress(worktreePath: string, currentBranch: string | null): Promise<boolean> {
  const branch = currentBranch?.trim();
  if (!branch) {
    return false;
  }
  try {
    const { stdout } = await execGit(worktreePath, ["reflog", "--format=%H", branch]);
    const hashes = new Set(
      stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
    return hashes.size > 1;
  } catch {
    return false;
  }
}

/**
 * remote 参照に対応するローカルブランチ参照を解決する
 */
async function resolveLocalCounterpartRef(worktreePath: string, baseRef: string): Promise<string | null> {
  const branch = resolveLocalBranchNameFromRemoteRef(baseRef);
  if (!branch || branch === baseRef) {
    return null;
  }
  return (await hasGitRef(worktreePath, branch)) ? branch : null;
}

/**
 * remote 参照から同名ローカルブランチ名を取り出す
 */
function resolveLocalBranchNameFromRemoteRef(baseRef: string): string | null {
  const ref = baseRef.trim();
  const remotePrefix = "refs/remotes/";
  if (ref.startsWith(remotePrefix)) {
    const shortRef = ref.slice(remotePrefix.length);
    const [, ...branchParts] = shortRef.split("/");
    const branch = branchParts.join("/").trim();
    return branch && branch !== "HEAD" ? branch : null;
  }
  if (ref.startsWith("refs/heads/")) {
    return null;
  }
  const [remoteName, ...branchParts] = ref.split("/");
  if ((remoteName !== "origin" && remoteName !== "upstream") || branchParts.length === 0) {
    return null;
  }
  const branch = branchParts.join("/").trim();
  return branch && branch !== "HEAD" ? branch : null;
}

/**
 * worktree のコミット済み状態を更新する
 */
function updateWorktreeCommitState(
  current: WorktreeCommitState,
  hasUnmergedCommits: boolean,
): { state: WorktreeCommitState; updated: boolean } {
  if (current.hasCommitted || !hasUnmergedCommits) {
    return { state: current, updated: false };
  }
  return { state: { hasCommitted: true }, updated: true };
}

/**
 * 保存済み baseRef を取得する
 */
async function resolveStoredBaseRef(worktreePath: string, storedBaseRef?: string | null): Promise<string | null> {
  if (storedBaseRef !== undefined) {
    const trimmed = storedBaseRef?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  const currentBranch = await readCurrentBranch(worktreePath);
  if (currentBranch) {
    const configBaseRef = await loadBaseRefForBranchConfig({ worktreePath, branch: currentBranch });
    const trimmedConfig = configBaseRef?.trim();
    if (trimmedConfig) {
      return trimmedConfig;
    }
  }
  const baseRef = await loadBaseRefForWorktreePath(worktreePath);
  const trimmed = baseRef?.trim();
  return trimmed || null;
}

/**
 * ワークツリーの最終コミット日時を取得する
 */
async function loadWorktreeLastCommitAt(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["log", "-1", "--format=%cd", "--date=format:%Y-%m-%d %H:%M"]);
    const value = stdout.trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * ベースブランチとの差分コミット数を取得する
 */
export async function loadAheadBehindCounts(args: {
  worktreePath: string;
  baseRef: string;
}): Promise<{ aheadCount: number; behindCount: number } | null> {
  const worktreePath = args.worktreePath.trim();
  const baseRef = args.baseRef.trim();
  if (!worktreePath || !baseRef) {
    return null;
  }
  try {
    const { stdout } = await execGit(worktreePath, ["rev-list", "--left-right", "--count", `${baseRef}...HEAD`]);
    const parts = stdout.trim().split(/\s+/);
    if (parts.length < 2) {
      return null;
    }
    const behind = Number.parseInt(parts[0] ?? "", 10);
    const ahead = Number.parseInt(parts[1] ?? "", 10);
    if (Number.isNaN(behind) || Number.isNaN(ahead)) {
      return null;
    }
    return { aheadCount: ahead, behindCount: behind };
  } catch {
    return null;
  }
}

/**
 * デフォルトのベース参照を取得する
 */
export async function loadDefaultBaseRef(worktreePath: string): Promise<string | null> {
  return resolveUpstreamRef(worktreePath);
}

/**
 * 複数パスの最終コミット日時をまとめて取得する
 */
export async function loadLastCommitAtByPath(paths: string[]): Promise<Map<string, string | null>> {
  const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));
  const entries = await Promise.all(
    uniquePaths.map(async (path) => [path, await loadWorktreeLastCommitAt(path)] as const),
  );
  return new Map(entries);
}

/**
 * 複数パスの現在ブランチ名をまとめて取得する
 */
export async function loadCurrentBranchByPath(paths: string[]): Promise<Map<string, string | null>> {
  const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));
  const entries = await Promise.all(uniquePaths.map(async (path) => [path, await readCurrentBranch(path)] as const));
  return new Map(entries);
}

/**
 * ワークツリーがクリーンか判定する（未追跡は除外）
 */
async function isWorktreeClean(worktreePath: string): Promise<boolean> {
  const summary = await readWorktreeStatusSummary(worktreePath);
  return summary.isClean;
}

/**
 * マージ先参照を推定して決定する
 */
export async function resolveMergeTargetRef(worktreePath: string): Promise<string | null> {
  const storedBaseRef = await resolveStoredBaseRef(worktreePath);
  if (storedBaseRef) {
    return storedBaseRef;
  }

  const currentBranch = await readCurrentBranch(worktreePath);
  const defaultRemoteRef = await readSymbolicOriginHead(worktreePath);
  const defaultBranch = defaultRemoteRef
    ? defaultRemoteRef.startsWith("origin/")
      ? defaultRemoteRef.slice("origin/".length)
      : defaultRemoteRef
    : null;
  if (currentBranch && defaultBranch && currentBranch === defaultBranch) {
    return resolveUpstreamRef(worktreePath);
  }

  const baseRef = await resolveBaseBranchRef(worktreePath, currentBranch, defaultBranch);
  if (baseRef) {
    return baseRef;
  }

  return resolveUpstreamRef(worktreePath);
}

/**
 * 現在のブランチ名を取得する
 */
async function readCurrentBranch(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
    const ref = stdout.trim();
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * 上流追跡ブランチ参照を取得する
 */
async function readUpstreamTrackingRef(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    const ref = stdout.trim();
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * 候補からベースブランチ参照を推定する
 */
async function resolveBaseBranchRef(
  worktreePath: string,
  currentBranch: string | null,
  defaultBranch: string | null,
): Promise<string | null> {
  if (!currentBranch) {
    return null;
  }
  const trackingRef = await readUpstreamTrackingRef(worktreePath);
  const candidates = await listMergeTargetCandidates(worktreePath, currentBranch, trackingRef);
  if (candidates.length === 0) {
    return null;
  }
  return selectBestBaseBranchRef(worktreePath, candidates, defaultBranch);
}

/**
 * 自動推定向けの参照一覧を取得する（ローカルのみ）
 */
async function listMergeTargetRefsLocalOnly(worktreePath: string): Promise<string[]> {
  try {
    const { stdout } = await execGit(worktreePath, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * マージ先候補の参照一覧を作る
 */
async function listMergeTargetCandidates(
  worktreePath: string,
  currentBranch: string,
  trackingRef: string | null,
): Promise<string[]> {
  const refs = await listMergeTargetRefsLocalOnly(worktreePath);
  const excluded = new Set<string>([currentBranch, "origin/HEAD", `origin/${currentBranch}`]);
  if (trackingRef) {
    excluded.add(trackingRef);
  }
  return refs.filter((ref) => !excluded.has(ref));
}

/**
 * refs/heads と refs/remotes の参照を取得する
 */
async function listMergeTargetRefsRaw(worktreePath: string): Promise<string[]> {
  try {
    const { stdout } = await execGit(worktreePath, [
      "for-each-ref",
      "--format=%(refname:short)",
      "refs/heads",
      "refs/remotes",
    ]);
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * マージ先ブランチ候補を一覧で取得する
 */
export async function listMergeTargetRefs(worktreePath: string): Promise<string[]> {
  const refs = await listMergeTargetRefsRaw(worktreePath);
  const excluded = new Set<string>(["origin/HEAD"]);
  const currentBranch = await readCurrentBranch(worktreePath);
  if (currentBranch) {
    excluded.add(currentBranch);
    excluded.add(`origin/${currentBranch}`);
  }
  const trackingRef = await readUpstreamTrackingRef(worktreePath);
  if (trackingRef) {
    excluded.add(trackingRef);
  }
  return refs.filter((ref) => !excluded.has(ref));
}

/**
 * 候補を評価して最適なベース参照を選ぶ
 */
async function selectBestBaseBranchRef(
  worktreePath: string,
  candidates: string[],
  defaultBranch: string | null,
): Promise<string | null> {
  const headHash = await readRefHash(worktreePath, "HEAD");
  const scored: Array<{
    ref: string;
    timestamp: number;
    containsHead: boolean;
    isPreferred: boolean;
  }> = [];

  for (const candidate of candidates) {
    const mergeBaseHash = await readMergeBaseHash(worktreePath, candidate);
    if (!mergeBaseHash) {
      continue;
    }
    const forkPoint = await readForkPointHash(worktreePath, candidate);
    const baseHash = forkPoint ?? mergeBaseHash;
    const timestamp = await readCommitTimestamp(worktreePath, baseHash);
    if (timestamp == null) {
      continue;
    }
    const containsHead = Boolean(headHash && mergeBaseHash === headHash);
    scored.push({
      ref: candidate,
      timestamp,
      containsHead,
      isPreferred: isPreferredMergeTarget(candidate, defaultBranch),
    });
  }

  if (scored.length === 0) {
    return null;
  }

  // HEAD を含むトピックブランチが優先されるのを避ける
  const filtered = scored.filter((entry) => !entry.containsHead || entry.isPreferred);
  const pool = filtered.length > 0 ? filtered : scored;

  let bestRef: string | null = null;
  let bestTimestamp = -1;
  for (const entry of pool) {
    if (entry.timestamp > bestTimestamp) {
      bestTimestamp = entry.timestamp;
      bestRef = entry.ref;
    }
  }
  return bestRef;
}

/**
 * 優先すべきマージ先ブランチか判定する
 * @todo ターゲットブランチ名が決め打ちになっているため改善方法を検討する
 */
function isPreferredMergeTarget(ref: string, defaultBranch: string | null): boolean {
  const name = normalizeBranchName(ref);
  if (defaultBranch && name === defaultBranch) {
    return true;
  }
  if (name === "main" || name === "master" || name === "develop" || name === "dev" || name === "trunk") {
    return true;
  }
  if (name === "staging" || name === "production") {
    return true;
  }
  return name.startsWith("release/") || name.startsWith("hotfix/");
}

/**
 * origin/ を外してブランチ名を正規化する
 */
function normalizeBranchName(ref: string): string {
  return ref.startsWith("origin/") ? ref.slice("origin/".length) : ref;
}

/**
 * フォークポイントのハッシュを取得する
 */
async function readForkPointHash(worktreePath: string, candidate: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["merge-base", "--fork-point", candidate, "HEAD"]);
    const hash = stdout.trim();
    return hash || null;
  } catch {
    return null;
  }
}

/**
 * merge-base のハッシュを取得する
 */
async function readMergeBaseHash(worktreePath: string, candidate: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["merge-base", "HEAD", candidate]);
    const hash = stdout.trim();
    return hash || null;
  } catch {
    return null;
  }
}

/**
 * 指定参照のコミット時刻を取得する
 */
async function readCommitTimestamp(worktreePath: string, ref: string): Promise<number | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["show", "-s", "--format=%ct", ref]);
    const raw = stdout.trim();
    if (!raw) {
      return null;
    }
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

/**
 * 上流参照を推定しフォールバックを適用する
 */
async function resolveUpstreamRef(worktreePath: string): Promise<string | null> {
  const candidate = await readSymbolicOriginHead(worktreePath);
  if (candidate && (await hasGitRef(worktreePath, candidate))) {
    return candidate;
  }
  const fallbacks = ["origin/main", "origin/master"];
  for (const fallback of fallbacks) {
    if (await hasGitRef(worktreePath, fallback)) {
      return fallback;
    }
  }
  return null;
}

/**
 * origin/HEAD の参照名を取得する
 */
async function readSymbolicOriginHead(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
    const ref = stdout.trim();
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * 参照が存在するか確認する
 */
async function hasGitRef(worktreePath: string, ref: string): Promise<boolean> {
  try {
    await execGit(worktreePath, ["rev-parse", "--verify", "--quiet", ref]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 参照のハッシュを取得する
 */
async function readRefHash(worktreePath: string, ref: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["rev-parse", ref]);
    const hash = stdout.trim();
    return hash || null;
  } catch {
    return null;
  }
}

/**
 * HEAD が参照へマージ済みか判定する
 */
async function isHeadMergedInto(worktreePath: string, upstreamRef: string): Promise<boolean | null> {
  try {
    await execGit(worktreePath, ["merge-base", "--is-ancestor", "HEAD", upstreamRef]);
    return true;
  } catch (error) {
    if (error && typeof error === "object") {
      const payload = error as { code?: number };
      if (payload.code === 1) {
        return false;
      }
    }
    return null;
  }
}
