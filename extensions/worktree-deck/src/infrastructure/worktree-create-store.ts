import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { expandHomePath, normalizePathValue } from "../domain/path-utils";
import { worktreeBaseRefService } from "../domain/worktree-base-ref.service";
import { worktreeCreateService } from "../domain/worktree-create.service";
import { isMissingExternalCommandError, normalizeExternalCommandError } from "./external-command-error";
import { resolveOriginRepoPath } from "./git-worktree-metadata-store";

const execFileAsync = promisify(execFile);
const COPY_WORKER_FILE_NAME = "copy_untracked_worker.js";

type RepositoryMapPaths = {
  scriptPath: string;
};

type ResolveArgs = {
  env: NodeJS.ProcessEnv;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
};

type CopyUntrackedJobPayload = {
  id: string;
  repoRoot: string;
  destination: string;
  statePath: string;
};

type CopyWorkerStartResult = {
  warning: string | null;
};

type ExistingWorktreeMatchResult = {
  matches: boolean;
  reason: string | null;
};

/**
 * worktree 作成スクリプトのパスを解決する
 */
function resolveCreateScriptPath(assetsPath: string): string {
  const directPath = join(assetsPath, "git_worktree_wrap.sh");
  if (existsSync(directPath)) {
    return directPath;
  }
  const fallbackPath = join(dirname(assetsPath), "git_worktree_wrap.sh");
  if (existsSync(fallbackPath)) {
    return fallbackPath;
  }
  return "";
}

/**
 * mapping とスクリプトのパス情報をまとめて返す
 */
export async function resolveRepositoryMapPaths(args: ResolveArgs): Promise<RepositoryMapPaths> {
  const scriptPath = resolveCreateScriptPath(args.assetsPath);
  return {
    scriptPath,
  };
}

/**
 * process env から指定キーの値を読み込む
 */
function readEnvValue(key: string): string | null {
  const fromProcess = process.env[key]?.trim();
  return fromProcess || null;
}

/**
 * worktree 作成先パスを組み立てる
 */
async function resolveWorktreeDestination(args: { mapValue?: string; branch: string }): Promise<string> {
  const basePath = readEnvValue("GIT_WORKTREE_PATH");
  if (!basePath) {
    throw new Error("GIT_WORKTREE_PATH is not set.");
  }
  const pathSegments = worktreeCreateService.buildDestinationPathSegments({
    mapValue: args.mapValue ?? null,
    branch: args.branch,
  });
  if (!pathSegments.ok) {
    throw new Error(pathSegments.error);
  }
  const resolvedBasePath = normalizePathValue(expandHomePath(basePath, process.env.HOME?.trim() || homedir()));
  return join(resolvedBasePath, ...pathSegments.value);
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

/**
 * worktree パスの現在ブランチを取得する
 */
async function readExistingWorktreeBranch(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(worktreePath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * パスを正規化して同一性を比較する
 */
function isSamePath(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }
  return normalizePathValue(left) === normalizePathValue(right);
}

/**
 * 既存 destination が復元対象 worktree と一致するか判定する
 */
async function matchExistingWorktree(args: {
  repoRoot: string;
  branch: string;
  destination: string;
}): Promise<ExistingWorktreeMatchResult> {
  if (!existsSync(join(args.destination, ".git"))) {
    return {
      matches: false,
      reason: "Destination does not contain a git worktree.",
    };
  }
  const [branch, originPath] = await Promise.all([
    readExistingWorktreeBranch(args.destination),
    resolveOriginRepoPath(args.destination),
  ]);
  if (branch !== args.branch) {
    return {
      matches: false,
      reason: "Destination uses a different branch.",
    };
  }
  if (!isSamePath(originPath, args.repoRoot)) {
    return {
      matches: false,
      reason: "Destination belongs to a different repository.",
    };
  }
  return {
    matches: true,
    reason: null,
  };
}

/**
 * restore 時に既存 worktree を復元済みとして採用できるか確認する
 */
async function reuseExistingWorktreeForRestore(args: {
  repoRoot: string;
  branch: string;
  destination: string;
}): Promise<{ createdPath: string; stdout: string; stderr: string; reusedExisting: true }> {
  const match = await matchExistingWorktree(args);
  if (!match.matches) {
    throw new Error(`Worktree destination already exists but does not match the deleted worktree. ${match.reason}`);
  }
  return {
    createdPath: args.destination,
    stdout: `Existing worktree: ${args.destination}\n`,
    stderr: "",
    reusedExisting: true,
  };
}

/**
 * ローカルブランチが存在するか判定する
 */
async function localBranchExists(args: { repoRoot: string; branch: string }): Promise<boolean> {
  try {
    await execGit(args.repoRoot, ["show-ref", "--verify", `refs/heads/${args.branch}`]);
    return true;
  } catch (error) {
    if (isMissingExternalCommandError(error)) {
      throw error;
    }
    return false;
  }
}

/**
 * コピー worker の配置パスを解決する
 */
function resolveCopyWorkerPath(scriptPath: string): string {
  return join(dirname(scriptPath), COPY_WORKER_FILE_NAME);
}

/**
 * worktree-deck の storage ディレクトリを解決する
 */
function resolveStorageDir(): string {
  return join(process.env.HOME?.trim() || homedir(), ".worktree-deck", "storage");
}

/**
 * コピー job の状態ファイルパスを作成する
 */
async function createCopyJobPayload(args: { repoRoot: string; destination: string }): Promise<CopyUntrackedJobPayload> {
  const id = randomUUID();
  const jobDir = join(resolveStorageDir(), "copy-jobs");
  const statePath = join(jobDir, `${id}.json`);
  await mkdir(jobDir, { recursive: true });
  await writeFile(
    statePath,
    JSON.stringify(
      {
        id,
        repoRoot: args.repoRoot,
        destination: args.destination,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  return {
    id,
    repoRoot: args.repoRoot,
    destination: args.destination,
    statePath,
  };
}

/**
 * 未追跡/ignored ファイルコピーを detached worker で開始する
 */
async function startUntrackedCopyWorker(args: {
  repoRoot: string;
  destination: string;
  scriptPath: string;
}): Promise<CopyWorkerStartResult> {
  try {
    const payload = await createCopyJobPayload({
      repoRoot: args.repoRoot,
      destination: args.destination,
    });
    const child = spawn(process.execPath, [resolveCopyWorkerPath(args.scriptPath), JSON.stringify(payload)], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { warning: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      warning: `Failed to start untracked files copy job: ${message}`,
    };
  }
}

/**
 * branch config に baseRef を保存する
 */
async function saveBranchBaseRef(args: { repoRoot: string; branch: string; baseRef?: string }): Promise<void> {
  const baseRef = args.baseRef?.trim();
  if (!baseRef) {
    return;
  }
  await execGit(args.repoRoot, ["config", worktreeBaseRefService.buildConfigKey(args.branch), baseRef]);
}

/**
 * TypeScript 実装で worktree を作成する
 */
export async function createWorktree(args: {
  repoRoot: string;
  branch: string;
  scriptPath: string;
  startPoint?: string;
  mapValue?: string;
  allowExistingWorktree?: boolean;
}): Promise<{ createdPath: string | null; stdout: string; stderr: string; reusedExisting?: boolean }> {
  const destination = await resolveWorktreeDestination(args);
  if (existsSync(destination)) {
    if (args.allowExistingWorktree === true) {
      return reuseExistingWorktreeForRestore({
        repoRoot: args.repoRoot,
        branch: args.branch,
        destination,
      });
    }
    throw new Error("Worktree destination already exists.");
  }
  await mkdir(dirname(destination), { recursive: true });
  const branchExists = await localBranchExists({ repoRoot: args.repoRoot, branch: args.branch });
  const gitArgs = branchExists
    ? ["worktree", "add", destination, args.branch]
    : ["worktree", "add", "-b", args.branch, destination, args.startPoint?.trim() || "HEAD"];
  const { stdout, stderr } = await execGit(args.repoRoot, gitArgs);
  if (!branchExists) {
    await saveBranchBaseRef({ repoRoot: args.repoRoot, branch: args.branch, baseRef: args.startPoint });
  }
  const copyWorkerStartResult = await startUntrackedCopyWorker({
    repoRoot: args.repoRoot,
    destination,
    scriptPath: args.scriptPath,
  });
  return {
    createdPath: destination,
    stdout,
    stderr: [stderr?.trim() ?? "", copyWorkerStartResult.warning].filter(Boolean).join("\n"),
  };
}

/**
 * ローカルブランチ一覧を取得してソートする
 */
export async function listLocalBranches(repoRoot: string): Promise<string[]> {
  const { stdout } = await execGit(repoRoot, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  return stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}
