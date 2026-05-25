import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

import type {
  CreateWorktreePullRequestDependencies,
  ResolveWorktreePullRequestTitleDependencies,
  WorktreePullRequestPlan as AppWorktreePullRequestPlan,
} from "../application/worktree-pull-request.usecase";
import {
  createBuildWorktreePullRequestPlanDependencies,
  createResolvePullRequestHeadBranchDependencies,
  type WorktreePullRequestInfra,
} from "../interface-adapters/worktree-pull-request-dependencies";
import { isMissingExternalCommandError, normalizeExternalCommandError } from "./external-command-error";
import { resolveMergeTargetRef } from "./worktree-store";

/**
 * gh コマンドを Promise で扱うラッパー
 */
const execFileAsync = promisify(execFile);

/**
 * gh の出力から URL を抽出する正規表現
 */
const PULL_REQUEST_URL_PATTERN = /https?:\/\/\S+/;

/**
 * PATHに追加する代表的な検索ディレクトリ
 */
const DEFAULT_COMMAND_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];

/**
 * PR作成に必要な情報をまとめた型
 */
type WorktreePullRequestPlan = {
  repoRoot: AppWorktreePullRequestPlan["repoRoot"];
  worktreePath: AppWorktreePullRequestPlan["worktreePath"];
  baseRef: AppWorktreePullRequestPlan["baseRef"];
  baseBranch: AppWorktreePullRequestPlan["baseBranch"];
  headBranch: AppWorktreePullRequestPlan["headBranch"];
  remoteName: AppWorktreePullRequestPlan["remoteName"];
  title: AppWorktreePullRequestPlan["title"];
  description: AppWorktreePullRequestPlan["description"];
  draft: AppWorktreePullRequestPlan["draft"];
};

/**
 * PR作成結果を受け取る型
 */
type WorktreePullRequestResult = {
  url: string | null;
  stdout: string;
  stderr: string;
};

/**
 * worktree PR ユースケース向けの infra 実装を生成する
 */
function createWorktreePullRequestInfra(): WorktreePullRequestInfra {
  return {
    readCurrentBranch,
    resolveMergeTargetRef,
    listRemotes,
    checkLocalBranchExists,
  };
}

/**
 * PR ヘッドブランチ解決ユースケース用の標準依存を作る
 */
export function createDefaultResolvePullRequestHeadBranchDependencies() {
  return createResolvePullRequestHeadBranchDependencies(createWorktreePullRequestInfra());
}

/**
 * PR 計画作成ユースケース用の標準依存を作る
 */
export function createDefaultBuildWorktreePullRequestPlanDependencies() {
  return createBuildWorktreePullRequestPlanDependencies(createWorktreePullRequestInfra());
}

/**
 * PR 作成実行ユースケース用の標準依存を作る
 */
export function createDefaultCreateWorktreePullRequestDependencies(): CreateWorktreePullRequestDependencies {
  return {
    countCommitsBetween,
    resolvePreferredRemoteName,
    checkRemoteBranchExists,
    pushRemoteBranch,
    createWorktreePullRequest,
  };
}

/**
 * PR 初期タイトル解決ユースケース用の標準依存を作る
 */
export function createDefaultResolveWorktreePullRequestTitleDependencies(): ResolveWorktreePullRequestTitleDependencies {
  return {
    resolveFirstCommitTitle,
  };
}

/**
 * gh を使って PR を作成する
 */
async function createWorktreePullRequest(plan: WorktreePullRequestPlan): Promise<WorktreePullRequestResult> {
  const callArgs = [
    "pr",
    "create",
    "--base",
    plan.baseBranch,
    "--head",
    plan.headBranch,
    "--title",
    plan.title,
    "--body",
    plan.description,
  ];
  if (plan.draft) {
    callArgs.push("--draft");
  }
  const envPath = buildCommandPath(process.env.PATH);
  const command = resolveGhCommand(envPath);
  if (!command) {
    throw normalizeExternalCommandError({ code: "ENOENT", path: "gh" }, "gh", "pull-request");
  }
  let stdout: string;
  let stderr: string;
  try {
    const result = await execFileAsync(command, callArgs, {
      cwd: plan.repoRoot,
      env: {
        ...process.env,
        PATH: envPath,
      },
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    throw normalizeExternalCommandError(error, "gh", "pull-request");
  }
  return {
    url: parsePullRequestUrl(stdout),
    stdout,
    stderr,
  };
}

/**
 * ベースとヘッドの差分コミット数を返す
 */
async function countCommitsBetween(args: { repoRoot: string; baseRef: string; headRef: string }): Promise<number> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository path is required.");
  }
  const baseRef = args.baseRef.trim();
  if (!baseRef) {
    throw new Error("Base ref is required.");
  }
  const headRef = args.headRef.trim();
  if (!headRef) {
    throw new Error("Head ref is required.");
  }
  const { stdout } = await execGit(repoRoot, ["rev-list", "--count", `${baseRef}..${headRef}`]);
  const count = Number.parseInt(stdout.trim(), 10);
  return Number.isNaN(count) ? 0 : count;
}

/**
 * PRの初期タイトル用に最初のコミット件名を取得する
 */
export async function resolveFirstCommitTitle(args: {
  repoRoot: string;
  baseRef: string;
  headRef: string;
}): Promise<string | null> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository path is required.");
  }
  const baseRef = args.baseRef.trim();
  if (!baseRef) {
    throw new Error("Base ref is required.");
  }
  const headRef = args.headRef.trim();
  if (!headRef) {
    throw new Error("Head ref is required.");
  }
  const { stdout } = await execGit(repoRoot, ["log", "--reverse", "--format=%s", `${baseRef}..${headRef}`]);
  const firstLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line);
  return firstLine ?? null;
}

/**
 * リモートブランチの存在を判定する
 */
async function checkRemoteBranchExists(args: {
  repoRoot: string;
  remoteName: string;
  branch: string;
}): Promise<boolean> {
  const repoRoot = args.repoRoot.trim();
  const remoteName = args.remoteName.trim();
  const branch = args.branch.trim();
  if (!repoRoot || !remoteName || !branch) {
    return false;
  }
  try {
    await execGit(repoRoot, ["show-ref", "--verify", `refs/remotes/${remoteName}/${branch}`]);
    return true;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return false;
  }
}

/**
 * リモートへブランチを push する
 */
async function pushRemoteBranch(args: { repoRoot: string; remoteName: string; branch: string }): Promise<void> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository path is required.");
  }
  const remoteName = args.remoteName.trim();
  if (!remoteName) {
    throw new Error("Remote is required.");
  }
  const branch = args.branch.trim();
  if (!branch) {
    throw new Error("Branch is required.");
  }
  await execGit(repoRoot, ["push", "-u", remoteName, branch]);
}

/**
 * 優先するリモート名を解決する
 */
async function resolvePreferredRemoteName(repoRoot: string): Promise<string | null> {
  const trimmed = repoRoot.trim();
  if (!trimmed) {
    return null;
  }
  const remotes = await listRemotes(trimmed);
  if (remotes.includes("origin")) {
    return "origin";
  }
  return remotes[0] ?? null;
}

/**
 * gh の出力から PR URL を抽出する
 */
function parsePullRequestUrl(stdout: string): string | null {
  const match = stdout.match(PULL_REQUEST_URL_PATTERN);
  return match?.[0]?.trim() ?? null;
}

/**
 * PATHを組み立てて検索対象を補正する
 */
function buildCommandPath(currentPath?: string): string {
  const existing = currentPath
    ? currentPath
        .split(delimiter)
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
  const additions = process.platform === "win32" ? [] : DEFAULT_COMMAND_PATHS;
  const merged = [...existing];
  for (const entry of additions) {
    if (!merged.includes(entry)) {
      merged.push(entry);
    }
  }
  return merged.join(delimiter);
}

/**
 * gh コマンドのパスを解決する
 */
function resolveGhCommand(envPath: string): string | null {
  return resolveExecutablePath("gh", envPath);
}

/**
 * PATHから実行ファイルの存在を確認する
 */
function resolveExecutablePath(command: string, envPath: string): string | null {
  const entries = envPath
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidates =
    process.platform === "win32" ? [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`] : [command];
  for (const entry of entries) {
    for (const candidate of candidates) {
      const fullPath = join(entry, candidate);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

/**
 * 現在のブランチ名を取得する
 */
async function readCurrentBranch(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
    const ref = stdout.trim();
    return ref || null;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return null;
  }
}

/**
 * ローカルブランチの存在を確認する
 */
async function checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean> {
  try {
    await execGit(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`]);
    return true;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return false;
  }
}

/**
 * リモート名の一覧を取得する
 */
async function listRemotes(repoRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execGit(repoRoot, ["remote"]);
    return stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return [];
  }
}

/**
 * git コマンドを対象リポジトリで実行する
 */
async function execGit(repoRoot: string, gitArgs: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["-C", repoRoot, ...gitArgs], { cwd: repoRoot });
    return { stdout, stderr };
  } catch (error) {
    throw normalizeExternalCommandError(error, "git", "git-worktree");
  }
}
