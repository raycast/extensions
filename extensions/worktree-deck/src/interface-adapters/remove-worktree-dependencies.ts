import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, normalize } from "node:path";
import { promisify } from "node:util";

import type {
  RemoveWorktreeDependencies,
  RemoveWorktreeInput,
  RemoveWorktreeResult,
  StartBackgroundRemoveWorktreeResult,
} from "../application/remove-worktree.usecase";

const execFileAsync = promisify(execFile);
const REMOVE_WORKER_FILE_NAME = "remove_worktree_worker.js";
type ExecFileImpl = typeof execFileAsync;
type WorktreeRemoveErrorKind = "dirty" | "directory-not-empty" | "locked" | "main-worktree" | "not-found" | "unknown";
type StartWorker = (payload: RemoveWorktreeJobPayload) => void;

/**
 * worktree 削除 job の worker payload
 */
type RemoveWorktreeJobPayload = RemoveWorktreeInput & {
  id: string;
  statePath: string;
  workerPath: string;
};

/**
 * removeWorktree で使う外部依存の入力ポート
 */
type RemoveWorktreeInfra = {
  runGit(args: { repoRoot: string; gitArgs: string[] }): Promise<RemoveWorktreeResult>;
  removeDirectory(args: { repoRoot: string; path: string }): Promise<void>;
  validateWorktreeRemoval?(args: { repoRoot: string; worktreePath: string; force?: boolean }): Promise<void>;
  startBackgroundWorktreeRemove?(input: RemoveWorktreeInput): Promise<StartBackgroundRemoveWorktreeResult>;
  startWorker?: StartWorker;
  createId?: () => string;
  now?: () => Date;
};

/**
 * リポジトリ配下で git コマンドを実行する
 */
async function runGitCommandInRepository(args: {
  repoRoot: string;
  gitArgs: string[];
  execFileImpl?: ExecFileImpl;
}): Promise<{ stdout: string; stderr: string }> {
  const execFileImpl = args.execFileImpl ?? execFileAsync;
  const repoRoot = resolveRepositoryCommandRoot(args.repoRoot);
  const { stdout, stderr } = await execFileImpl("git", ["-C", repoRoot, ...args.gitArgs], {
    cwd: repoRoot,
  });
  return { stdout, stderr };
}

/**
 * git コマンド実行に使える repo root へ補正する
 */
function resolveRepositoryCommandRoot(repoRoot: string): string {
  const normalized = normalizeComparablePath(repoRoot);
  const worktreesDir = dirname(normalized);
  const gitDir = dirname(worktreesDir);
  if (basename(worktreesDir) === "worktrees" && basename(gitDir) === ".git") {
    return dirname(gitDir);
  }
  return repoRoot;
}

/**
 * removeWorktree 向けの標準 infra 実装を組み立てる
 */
export function createRemoveWorktreeInfra(args?: { execFileImpl?: ExecFileImpl }): RemoveWorktreeInfra {
  const runGit = (command: { repoRoot: string; gitArgs: string[] }) =>
    runGitCommandInRepository({
      repoRoot: command.repoRoot,
      gitArgs: command.gitArgs,
      execFileImpl: args?.execFileImpl,
    });
  return {
    runGit,
    async removeDirectory(command) {
      await rm(command.path, { recursive: true, force: true });
    },
    validateWorktreeRemoval(command) {
      return validateWorktreeRemovalWithGit(command, runGit);
    },
    startBackgroundWorktreeRemove(input) {
      return startBackgroundWorktreeRemoveWithWorker(input);
    },
  };
}

/**
 * 例外情報からエラーメッセージを抽出する
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

/**
 * worktree remove の失敗理由を分類する
 */
function classifyWorktreeRemoveError(error: unknown): WorktreeRemoveErrorKind {
  const message = extractErrorMessage(error).toLowerCase();
  if (message.includes("contains modified or untracked files")) {
    return "dirty";
  }
  if (message.includes("failed to delete") && message.includes("directory not empty")) {
    return "directory-not-empty";
  }
  if (message.includes("locked working tree") || message.includes("cannot remove a locked")) {
    return "locked";
  }
  if (message.includes("is a main working tree")) {
    return "main-worktree";
  }
  if (message.includes("does not exist") || message.includes("no such file or directory")) {
    return "not-found";
  }
  return "unknown";
}

/**
 * stale metadata の可能性があり prune 再試行できる失敗か判定する
 */
function canRetryWithPrune(error: unknown): boolean {
  return classifyWorktreeRemoveError(error) === "not-found";
}

/**
 * remove の git 引数を組み立てる
 */
function buildWorktreeRemoveGitArgs(args: { worktreePath: string; force?: boolean }): string[] {
  const gitArgs = ["worktree", "remove"];
  if (args.force === true) {
    gitArgs.push("--force");
  }
  gitArgs.push(args.worktreePath);
  return gitArgs;
}

/**
 * パス比較用に末尾区切りを揃える
 */
function normalizeComparablePath(pathValue: string): string {
  return normalize(pathValue).replace(/\/+$/, "");
}

/**
 * main worktree の削除指定か判定する
 */
function isMainWorktreePath(args: { repoRoot: string; worktreePath: string }): boolean {
  return normalizeComparablePath(args.repoRoot) === normalizeComparablePath(args.worktreePath);
}

/**
 * worktree list --porcelain の対象 section を抽出する
 */
function findWorktreePorcelainSection(args: { porcelain: string; worktreePath: string }): string[] {
  const targetPath = normalizeComparablePath(args.worktreePath);
  const sections = args.porcelain.split(/\r?\n\r?\n/);
  for (const section of sections) {
    const lines = section.split(/\r?\n/).filter(Boolean);
    const worktreeLine = lines.find((line) => line.startsWith("worktree "));
    if (worktreeLine === undefined) {
      continue;
    }
    const listedPath = normalizeComparablePath(worktreeLine.slice("worktree ".length));
    if (listedPath === targetPath) {
      return lines;
    }
  }
  return [];
}

/**
 * worktree list の結果から locked 状態を判定する
 */
function isLockedWorktree(args: { porcelain: string; worktreePath: string }): boolean {
  return findWorktreePorcelainSection(args).some((line) => line === "locked" || line.startsWith("locked "));
}

/**
 * worker script の候補パスを返す
 */
function resolveRemoveWorkerPath(assetsPath?: string): string {
  const envPath = process.env.WORKTREE_REMOVE_WORKER_PATH?.trim();
  if (envPath !== undefined && envPath.length > 0) {
    if (!existsSync(envPath)) {
      throw new Error("Remove worker script was not found.");
    }
    return envPath;
  }
  const normalizedAssetsPath = assetsPath?.trim();
  if (normalizedAssetsPath !== undefined && normalizedAssetsPath.length > 0) {
    const workerPath = join(normalizedAssetsPath, REMOVE_WORKER_FILE_NAME);
    if (!existsSync(workerPath)) {
      throw new Error("Remove worker script was not found.");
    }
    return workerPath;
  }
  const candidates = [
    join(__dirname, "..", "assets", REMOVE_WORKER_FILE_NAME),
    join(__dirname, "../../assets", REMOVE_WORKER_FILE_NAME),
    join(process.cwd(), "assets", REMOVE_WORKER_FILE_NAME),
  ];
  const workerPath = candidates.find((candidate) => existsSync(candidate));
  if (workerPath === undefined) {
    throw new Error("Remove worker script was not found.");
  }
  return workerPath;
}

/**
 * worktree-deck の storage ディレクトリを解決する
 */
function resolveStorageDir(): string {
  const homeDir = process.env.HOME?.trim();
  return join(homeDir !== undefined && homeDir.length > 0 ? homeDir : homedir(), ".worktree-deck", "storage");
}

/**
 * 削除 worker を detached process として開始する
 */
function startDetachedRemoveWorker(payload: RemoveWorktreeJobPayload): void {
  const child = spawn(process.execPath, [payload.workerPath, JSON.stringify(payload)], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

/**
 * 削除 job の状態ファイルを作成して worker を起動する
 */
async function createRemoveJob(args: {
  input: RemoveWorktreeInput;
  startWorker?: StartWorker;
  createId?: () => string;
  now?: () => Date;
}): Promise<StartBackgroundRemoveWorktreeResult> {
  const jobId = args.createId?.() ?? randomUUID();
  const jobDir = join(resolveStorageDir(), "remove-jobs");
  const statePath = join(jobDir, `${jobId}.json`);
  const now = args.now?.() ?? new Date();
  const payload: RemoveWorktreeJobPayload = {
    ...args.input,
    id: jobId,
    statePath,
    workerPath: resolveRemoveWorkerPath(args.input.assetsPath),
  };
  await mkdir(jobDir, { recursive: true });
  await writeFile(
    statePath,
    JSON.stringify(
      {
        ...payload,
        status: "pending",
        createdAt: now.toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  (args.startWorker ?? startDetachedRemoveWorker)(payload);
  return { jobId, statePath };
}

/**
 * git 情報を使って削除前に即時検出できる失敗を検証する
 */
async function validateWorktreeRemovalWithGit(
  args: { repoRoot: string; worktreePath: string; force?: boolean },
  runGit: RemoveWorktreeInfra["runGit"],
): Promise<void> {
  if (isMainWorktreePath(args)) {
    throw new Error("Cannot remove the main working tree.");
  }
  const status = await runGit({
    repoRoot: args.repoRoot,
    gitArgs: ["-C", args.worktreePath, "status", "--porcelain"],
  });
  if (args.force !== true && status.stdout.trim().length > 0) {
    throw new Error("Working tree has modified or untracked files.");
  }
  const worktreeList = await runGit({
    repoRoot: args.repoRoot,
    gitArgs: ["worktree", "list", "--porcelain"],
  });
  if (isLockedWorktree({ porcelain: worktreeList.stdout, worktreePath: args.worktreePath })) {
    throw new Error("Working tree is locked.");
  }
}

/**
 * 標準 worker 実装でバックグラウンド削除を開始する
 */
async function startBackgroundWorktreeRemoveWithWorker(
  input: RemoveWorktreeInput,
): Promise<StartBackgroundRemoveWorktreeResult> {
  return createRemoveJob({ input });
}

/**
 * removeWorktree ユースケース向けの依存アダプタを組み立てる
 */
export function createRemoveWorktreeDependencies(infra: RemoveWorktreeInfra): RemoveWorktreeDependencies {
  return {
    validateWorktreeRemoval(args) {
      return infra.validateWorktreeRemoval?.(args) ?? validateWorktreeRemovalWithGit(args, infra.runGit);
    },
    startBackgroundWorktreeRemove(input) {
      return (
        infra.startBackgroundWorktreeRemove?.(input) ??
        createRemoveJob({
          input,
          startWorker: infra.startWorker,
          createId: infra.createId,
          now: infra.now,
        })
      );
    },
    async runWorktreeRemove(args) {
      const gitArgs = buildWorktreeRemoveGitArgs({
        worktreePath: args.worktreePath,
        force: args.force,
      });
      try {
        return await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs,
        });
      } catch (error) {
        const kind = classifyWorktreeRemoveError(error);
        if (kind === "dirty") {
          throw new Error("Working tree has modified or untracked files.");
        }
        if (kind === "main-worktree") {
          throw new Error("Cannot remove the main working tree.");
        }
        if (kind === "directory-not-empty") {
          await infra.removeDirectory({
            repoRoot: args.repoRoot,
            path: args.worktreePath,
          });
          return { stdout: "", stderr: "Removed remaining worktree directory." };
        }
        if (kind === "locked") {
          throw new Error("Working tree is locked.");
        }
        if (canRetryWithPrune(error)) {
          await infra.runGit({
            repoRoot: args.repoRoot,
            gitArgs: ["worktree", "prune"],
          });
          return infra.runGit({
            repoRoot: args.repoRoot,
            gitArgs,
          });
        }
        throw error;
      }
    },
    async checkLocalBranchExists(args) {
      try {
        await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["show-ref", "--verify", `refs/heads/${args.branch}`],
        });
        return true;
      } catch {
        return false;
      }
    },
    async deleteLocalBranch(args) {
      await infra.runGit({
        repoRoot: args.repoRoot,
        gitArgs: ["branch", "-D", args.branch],
      });
    },
    async listRemotes(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["remote"],
        });
        return stdout
          .split(/\r?\n/)
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
      } catch {
        return [];
      }
    },
    async readGitConfigValue(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["config", "--get", args.key],
        });
        const value = stdout.trim();
        return value || null;
      } catch {
        return null;
      }
    },
    async checkRemoteBranchExists(args) {
      try {
        const { stdout } = await infra.runGit({
          repoRoot: args.repoRoot,
          gitArgs: ["ls-remote", "--heads", args.remote, args.branch],
        });
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    },
    async deleteRemoteBranch(args) {
      await infra.runGit({
        repoRoot: args.repoRoot,
        gitArgs: ["push", args.remote, "--delete", args.branch],
      });
    },
  };
}

/**
 * 既存 infra 実装を使った依存アダプタを生成する
 */
export function createDefaultRemoveWorktreeDependencies(): RemoveWorktreeDependencies {
  return createRemoveWorktreeDependencies(createRemoveWorktreeInfra());
}
