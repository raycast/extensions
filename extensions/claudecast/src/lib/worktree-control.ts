import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { isWindows } from "./platform";
import { getWindowsEnvironment } from "./windows-runtime";
import {
  assertPrunePreviewParity,
  buildWorktreeCommand,
  createTaskLimiter,
  formatPrunePreview,
  parseGitStatusPorcelain,
  parseGitWorktreePorcelain,
  worktreePathIdentity,
  type GitWorktreeRecord,
  type WorktreeStatus,
} from "./worktree-core";
import type { ClaudeAgentSession } from "./agent-control-core";

const execFilePromise = promisify(execFile);
const MAX_GIT_OUTPUT_BYTES = 2 * 1024 * 1024;
const GIT_TIMEOUT_MS = 15_000;
const DISCOVERY_CONCURRENCY = 4;

export interface ManagedWorktree {
  repositoryRoot: string;
  repositoryName: string;
  record: GitWorktreeRecord;
  status?: WorktreeStatus;
  diffSummary: string;
  pathExists: boolean;
  lastActivity?: Date;
  agents: ClaudeAgentSession[];
}

export async function discoverManagedWorktrees(
  projectPaths: string[],
  agents: ClaudeAgentSession[] = [],
  signal?: AbortSignal,
): Promise<ManagedWorktree[]> {
  const env = isWindows() ? await getWindowsEnvironment() : process.env;
  const limitGit = createTaskLimiter(DISCOVERY_CONCURRENCY);
  const git = (cwd: string, args: string[], timeout = GIT_TIMEOUT_MS) =>
    limitGit(() => runGit(cwd, args, timeout, env, signal));
  const repositories = new Map<
    string,
    { root: string; commonDirectory: string }
  >();
  const uniqueProjects = new Map<string, string>();
  for (const projectPath of projectPaths) {
    const identity = worktreePathIdentity(projectPath);
    if (!uniqueProjects.has(identity))
      uniqueProjects.set(identity, projectPath);
  }
  await mapWithConcurrency(
    [...uniqueProjects.values()],
    DISCOVERY_CONCURRENCY,
    async (projectPath) => {
      try {
        const [root, commonDirectory] = await Promise.all([
          git(projectPath, ["rev-parse", "--show-toplevel"]),
          git(projectPath, [
            "rev-parse",
            "--path-format=absolute",
            "--git-common-dir",
          ]),
        ]);
        const normalizedRoot = root.trim();
        const normalizedCommonDirectory = commonDirectory.trim();
        if (!normalizedRoot || !normalizedCommonDirectory) return;
        const identity = worktreePathIdentity(normalizedCommonDirectory);
        if (!repositories.has(identity)) {
          repositories.set(identity, {
            root: normalizedRoot,
            commonDirectory: normalizedCommonDirectory,
          });
        }
      } catch {
        return;
      }
    },
  );

  const worktrees: ManagedWorktree[] = [];
  await mapWithConcurrency(
    [...repositories.values()],
    DISCOVERY_CONCURRENCY,
    async (repository) => {
      let records: GitWorktreeRecord[];
      try {
        records = parseGitWorktreePorcelain(
          await git(repository.root, ["worktree", "list", "--porcelain", "-z"]),
        );
      } catch {
        return;
      }
      const stableRepositoryRoot = records[0]?.path || repository.root;
      const repositoryName =
        path.basename(records[0]?.path || repository.root) || repository.root;
      const details = await mapWithConcurrency(
        records,
        DISCOVERY_CONCURRENCY,
        async (record): Promise<ManagedWorktree> => {
          const pathAgents = agents.filter(
            (agent) =>
              worktreePathIdentity(agent.cwd) ===
              worktreePathIdentity(record.path),
          );
          if (
            record.bare ||
            record.prunable ||
            !(await isDirectory(record.path))
          ) {
            return {
              repositoryRoot: stableRepositoryRoot,
              repositoryName,
              record,
              diffSummary: "",
              pathExists: false,
              agents: pathAgents,
            };
          }
          const [status, unstagedDiff, stagedDiff, commitTimestamp, stat] =
            await Promise.all([
              git(record.path, [
                "status",
                "--porcelain=v1",
                "-z",
                "--untracked-files=normal",
              ])
                .then(parseGitStatusPorcelain)
                .catch(() => undefined),
              git(record.path, ["diff", "--stat", "--compact-summary", "--"])
                .then((value) => value.trim())
                .catch(() => ""),
              git(record.path, [
                "diff",
                "--cached",
                "--stat",
                "--compact-summary",
                "--",
              ])
                .then((value) => value.trim())
                .catch(() => ""),
              git(record.path, ["log", "-1", "--format=%ct"])
                .then((value) => Number(value.trim()) * 1000)
                .catch(() => 0),
              fs.promises.stat(record.path).catch(() => undefined),
            ]);
          const changedPathActivity = status
            ? await newestChangedPathMtime(record.path, status.paths)
            : 0;
          const lastActivityMs = Math.max(
            Number.isFinite(commitTimestamp) ? commitTimestamp : 0,
            stat?.mtimeMs ?? 0,
            ...pathAgents.map((agent) => agent.startedAt),
            changedPathActivity,
          );
          return {
            repositoryRoot: stableRepositoryRoot,
            repositoryName,
            record,
            status,
            diffSummary: [stagedDiff && `Staged\n${stagedDiff}`, unstagedDiff]
              .filter(Boolean)
              .join("\n\n")
              .slice(0, 20_000),
            pathExists: true,
            lastActivity:
              lastActivityMs > 0 ? new Date(lastActivityMs) : undefined,
            agents: pathAgents,
          };
        },
      );
      worktrees.push(...details);
    },
  );

  return worktrees.sort(
    (left, right) =>
      Number(right.agents.length > 0) - Number(left.agents.length > 0) ||
      Number(Boolean(right.status && !right.status.isClean)) -
        Number(Boolean(left.status && !left.status.isClean)) ||
      (right.lastActivity?.getTime() ?? 0) -
        (left.lastActivity?.getTime() ?? 0) ||
      left.record.path.localeCompare(right.record.path),
  );
}

export async function runManagedWorktreeAction(
  repositoryRoot: string,
  action: "lock" | "unlock" | "remove",
  worktreePath: string,
  lockReason?: string,
): Promise<void> {
  await runGit(
    repositoryRoot,
    buildWorktreeCommand(action, worktreePath, lockReason),
    30_000,
  );
}

export async function previewPrunableWorktrees(
  repositoryRoot: string,
): Promise<string> {
  const result = await runGitCapture(repositoryRoot, [
    "worktree",
    "prune",
    "--dry-run",
    "--verbose",
    "--expire",
    "now",
  ]);
  return formatPrunePreview(result.stdout, result.stderr);
}

export async function pruneMissingWorktrees(
  repositoryRoot: string,
  expectedPreview: string,
): Promise<void> {
  const currentPreview = (
    await previewPrunableWorktrees(repositoryRoot)
  ).trim();
  assertPrunePreviewParity(expectedPreview, currentPreview);
  await runGit(
    repositoryRoot,
    ["worktree", "prune", "--verbose", "--expire", "now"],
    30_000,
  );
}

async function runGit(
  cwd: string,
  args: string[],
  timeout = GIT_TIMEOUT_MS,
  suppliedEnv?: NodeJS.ProcessEnv,
  signal?: AbortSignal,
): Promise<string> {
  return (await runGitCapture(cwd, args, timeout, suppliedEnv, signal)).stdout;
}

async function runGitCapture(
  cwd: string,
  args: string[],
  timeout = GIT_TIMEOUT_MS,
  suppliedEnv?: NodeJS.ProcessEnv,
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string }> {
  const env =
    suppliedEnv ?? (isWindows() ? await getWindowsEnvironment() : process.env);
  try {
    const { stdout, stderr } = await execFilePromise("git", args, {
      cwd,
      env,
      encoding: "utf8",
      timeout,
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      windowsHide: true,
      signal,
    });
    return { stdout, stderr };
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string };
    const message = failure.stderr?.trim() || failure.stdout?.trim();
    throw new Error(
      message || failure.message || "Git Worktree Command Failed",
    );
  }
}

async function isDirectory(directoryPath: string): Promise<boolean> {
  try {
    return (await fs.promises.stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function newestChangedPathMtime(
  worktreePath: string,
  changedPaths: string[],
): Promise<number> {
  const rootIdentity = worktreePathIdentity(worktreePath);
  let newest = 0;
  for (const changedPath of changedPaths.slice(0, 100)) {
    const candidate = path.resolve(worktreePath, changedPath);
    const candidateIdentity = worktreePathIdentity(candidate);
    if (
      candidateIdentity !== rootIdentity &&
      !candidateIdentity.startsWith(`${rootIdentity}${path.sep}`)
    ) {
      continue;
    }
    try {
      newest = Math.max(newest, (await fs.promises.stat(candidate)).mtimeMs);
    } catch {
      continue;
    }
  }
  return newest;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      for (;;) {
        const index = cursor++;
        if (index >= values.length) return;
        results[index] = await mapper(values[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
