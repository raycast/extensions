import type { RepositoryGitInfo, RepositoryKind, RepositoryStatus } from "../types/repository";
import { type Result } from "../utils/result";
import { type GitExecOptions, runGit } from "./exec";
import { toWebUrl } from "./remote";

/**
 * Reads Git metadata for a single repository. Each piece of metadata is fetched
 * independently and tolerantly: a failure to read one field (e.g. no remote)
 * never prevents the others from being populated. See docs/ARCHITECTURE.md
 * ("Enrichment flow").
 */

/** A function that runs git; injectable so tests need no real repositories. */
export type GitRunner = (
  args: readonly string[],
  options: GitExecOptions,
) => Promise<Result<string, Error>>;

/** Options for {@link readRepositoryGitInfo}. */
export interface ReadGitInfoOptions {
  /** Override the git runner (defaults to the real {@link runGit}). */
  readonly runner?: GitRunner;
  /** Per-command timeout in milliseconds. */
  readonly timeoutMs?: number;
}

/** Parse `git rev-parse --abbrev-ref HEAD`; `HEAD` means detached → `null`. */
function parseBranch(result: Result<string, Error>): string | null {
  if (!result.ok) {
    return null;
  }
  const value = result.value.trim();
  if (value.length === 0 || value === "HEAD") {
    return null;
  }
  return value;
}

/** Interpret `git status --porcelain`: any output means the tree is dirty. */
function parseStatus(result: Result<string, Error>): RepositoryStatus {
  if (!result.ok) {
    return "unknown";
  }
  return result.value.trim().length > 0 ? "dirty" : "clean";
}

/** Parse a remote URL, treating empty output as absent. */
function parseRemote(result: Result<string, Error>): string | null {
  if (!result.ok) {
    return null;
  }
  const value = result.value.trim();
  return value.length > 0 ? value : null;
}

/** Parse `git log -1 --format=%ct` (unix seconds) into a number or `null`. */
function parseLastCommit(result: Result<string, Error>): number | null {
  if (!result.ok) {
    return null;
  }
  const seconds = Number.parseInt(result.value.trim(), 10);
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * Read all Git metadata for a repository.
 *
 * @param repoPath Absolute path to the repository root.
 * @param kind     Repository kind; bare repos skip the working-tree status.
 * @param options  See {@link ReadGitInfoOptions}.
 */
export async function readRepositoryGitInfo(
  repoPath: string,
  kind: RepositoryKind,
  options: ReadGitInfoOptions = {},
): Promise<RepositoryGitInfo> {
  const run = options.runner ?? runGit;
  const execOptions: GitExecOptions = { cwd: repoPath, timeoutMs: options.timeoutMs };

  const isBare = kind === "bare";

  const [branchResult, statusResult, remoteResult, lastCommitResult] = await Promise.all([
    run(["rev-parse", "--abbrev-ref", "HEAD"], execOptions),
    isBare
      ? Promise.resolve<Result<string, Error>>({ ok: false, error: new Error("bare repo") })
      : run(["status", "--porcelain"], execOptions),
    run(["config", "--get", "remote.origin.url"], execOptions),
    run(["log", "-1", "--format=%ct"], execOptions),
  ]);

  const remoteUrl = parseRemote(remoteResult);

  return {
    branch: parseBranch(branchResult),
    status: parseStatus(statusResult),
    remoteUrl,
    remoteWebUrl: toWebUrl(remoteUrl),
    lastCommitAt: parseLastCommit(lastCommitResult),
  };
}
