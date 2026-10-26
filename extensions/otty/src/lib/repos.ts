// Git details for the Repositories view. Node only, no @raycast/api import, so
// vitest can exercise everything here.
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { mapConcurrent } from "./concurrency";

const execFileAsync = promisify(execFile);

export type RepoInfo = {
  branch?: string;
  /** Milliseconds since the epoch. */
  lastCommit?: number;
  /** Against the upstream branch, as of the last fetch. */
  ahead?: number;
  behind?: number;
  /** The GitHub owner of `origin`, when it is hosted on github.com. */
  owner?: string;
  /** Files with uncommitted changes, untracked ones included. */
  changed?: number;
};

/** `@{u}...HEAD` counts with `--left-right`: upstream-only, then HEAD-only. */
export function parseAheadBehind(output: string): { behind: number; ahead: number } | undefined {
  const match = output.trim().match(/^(\d+)\s+(\d+)$/);
  return match ? { behind: Number(match[1]), ahead: Number(match[2]) } : undefined;
}

/** The repo's git dir; a worktree or submodule's `.git` file points at it. */
async function resolveGitDir(repo: string): Promise<string> {
  const dotGit = join(repo, ".git");
  const pointer = await readFile(dotGit, "utf8").catch(() => undefined);
  const target = pointer?.match(/^gitdir:\s*(.+)$/m)?.[1].trim();
  if (!target) return dotGit;
  return isAbsolute(target) ? target : resolve(repo, target);
}

/** The checked-out branch, read from HEAD directly; no git process needed. */
export async function readBranch(repo: string): Promise<string | undefined> {
  const gitDir = await resolveGitDir(repo);
  const head = await readFile(join(gitDir, "HEAD"), "utf8").catch(() => undefined);
  if (!head) return undefined;
  const ref = head.match(/^ref:\s*refs\/heads\/(.+)$/m)?.[1].trim();
  return ref ?? head.trim().slice(0, 7);
}

/** `origin`'s url from a git config file. */
export function parseOriginUrl(config: string): string | undefined {
  let inOrigin = false;
  for (const line of config.split("\n")) {
    const section = line.match(/^\s*\[(.+)\]\s*$/);
    if (section) {
      inOrigin = section[1].trim() === 'remote "origin"';
      continue;
    }
    const url = inOrigin && line.match(/^\s*url\s*=\s*(.+?)\s*$/);
    if (url) return url[1];
  }
  return undefined;
}

/** The owner in a github.com remote url, in https, scp, or ssh form. */
export function githubOwner(url: string | undefined): string | undefined {
  return url?.match(/^(?:https?:\/\/|ssh:\/\/git@|git@)github\.com[/:]([^/]+)\//)?.[1];
}

export function countChanges(porcelain: string): number {
  return porcelain.split("\n").filter((line) => line.trim()).length;
}

/** `origin`'s url, read from config; a worktree's lives in its main repo. */
async function readOriginUrl(repo: string): Promise<string | undefined> {
  const gitDir = await resolveGitDir(repo);
  const common = await readFile(join(gitDir, "commondir"), "utf8").catch(() => undefined);
  const configDir = common ? resolve(gitDir, common.trim()) : gitDir;
  const config = await readFile(join(configDir, "config"), "utf8").catch(() => undefined);
  return config ? parseOriginUrl(config) : undefined;
}

async function git(repo: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, ...args], {
      timeout: 5000,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

export async function loadRepoInfo(repo: string): Promise<RepoInfo> {
  const [branch, origin, timestamp, counts, status] = await Promise.all([
    readBranch(repo),
    readOriginUrl(repo),
    git(repo, ["log", "-1", "--format=%ct"]),
    git(repo, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    // List each untracked file, not one line per new folder.
    git(repo, ["status", "--porcelain", "--untracked-files=all"]),
  ]);
  const seconds = Number(timestamp?.trim());
  return {
    branch,
    lastCommit: seconds > 0 ? seconds * 1000 : undefined,
    ...(counts ? parseAheadBehind(counts) : {}),
    owner: githubOwner(origin),
    changed: status === undefined ? undefined : countChanges(status),
  };
}

/** Details for every repo, a dozen at a time; each needs three short git runs. */
export async function loadRepoInfos(repos: string[]): Promise<Record<string, RepoInfo>> {
  const infos = await mapConcurrent(repos, 12, loadRepoInfo);
  return Object.fromEntries(repos.map((repo, index) => [repo, infos[index]]));
}

/** Most recent commit first; repos with no known commit go last, by path. */
export function sortByRecent(repos: string[], infos: Record<string, RepoInfo>): string[] {
  return [...repos].sort((a, b) => (infos[b]?.lastCommit ?? 0) - (infos[a]?.lastCommit ?? 0) || a.localeCompare(b));
}
