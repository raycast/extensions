import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { mapConcurrent } from "./concurrency";

const execFileAsync = promisify(execFile);

const REPO_INFO_CONCURRENCY = 12;

export type RepoInfo = {
  branch?: string;
  lastCommitMs?: number;
  /** Against the upstream branch, as of the last fetch. */
  ahead?: number;
  behind?: number;
  owner?: string;
  changed?: number;
};

/**
 * `git status --porcelain=v2 --branch`: ahead/behind from the `# branch.ab +A -B`
 * header (absent with no upstream), and one non-header line per changed file.
 */
export function parseStatus(output: string): { ahead?: number; behind?: number; changed: number } {
  const lines = output.split("\n").filter((line) => line.trim());
  const ab = lines.find((line) => line.startsWith("# branch.ab "))?.match(/^# branch\.ab \+(\d+) -(\d+)$/);
  return {
    ...(ab ? { ahead: Number(ab[1]), behind: Number(ab[2]) } : {}),
    changed: lines.filter((line) => !line.startsWith("#")).length,
  };
}

/** `rev-list --left-right --count @{u}...HEAD` prints upstream-only, then HEAD-only. */
export function parseAheadBehind(output: string): { behind: number; ahead: number } | undefined {
  const match = output.trim().match(/^(\d+)\s+(\d+)$/);
  return match ? { behind: Number(match[1]), ahead: Number(match[2]) } : undefined;
}

/** A worktree or submodule's `.git` is a file pointing at its git dir. */
async function resolveGitDir(repo: string): Promise<string> {
  const dotGit = join(repo, ".git");
  const pointer = await readFile(dotGit, "utf8").catch(() => undefined);
  const target = pointer?.match(/^gitdir:\s*(.+)$/m)?.[1].trim();
  if (!target) return dotGit;
  return isAbsolute(target) ? target : resolve(repo, target);
}

export async function readBranch(repo: string, gitDir?: string): Promise<string | undefined> {
  const head = await readFile(join(gitDir ?? (await resolveGitDir(repo)), "HEAD"), "utf8").catch(() => undefined);
  if (!head) return undefined;
  const ref = head.match(/^ref:\s*refs\/heads\/(.+)$/m)?.[1].trim();
  return ref ?? head.trim().slice(0, 7);
}

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

export function githubOwner(url: string | undefined): string | undefined {
  return url?.match(/^(?:https?:\/\/|ssh:\/\/git@|git@)github\.com[/:]([^/]+)\//)?.[1];
}

/** A worktree's config lives in its main repo, which its `commondir` names. */
async function readOriginUrl(gitDir: string): Promise<string | undefined> {
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
  const gitDir = await resolveGitDir(repo);
  const [branch, origin, timestamp, status] = await Promise.all([
    readBranch(repo, gitDir),
    readOriginUrl(gitDir),
    git(repo, ["log", "-1", "--format=%ct"]),
    // List each untracked file, not one line per new folder.
    git(repo, ["status", "--porcelain=v2", "--branch", "--untracked-files=all"]),
  ]);
  const seconds = Number(timestamp?.trim());
  // A status scan can time out on a huge working tree while the commit
  // comparison alone would still finish, so ask for that separately.
  const counts =
    status === undefined ? await git(repo, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]) : undefined;
  return {
    branch,
    lastCommitMs: seconds > 0 ? seconds * 1000 : undefined,
    ...(status === undefined ? (counts ? parseAheadBehind(counts) : {}) : parseStatus(status)),
    owner: githubOwner(origin),
  };
}

export async function loadRepoInfos(repos: string[]): Promise<Record<string, RepoInfo>> {
  const infos = await mapConcurrent(repos, REPO_INFO_CONCURRENCY, loadRepoInfo);
  return Object.fromEntries(repos.map((repo, index) => [repo, infos[index]]));
}

export function sortByRecent(repos: string[], infos: Record<string, RepoInfo>): string[] {
  return [...repos].sort((a, b) => (infos[b]?.lastCommitMs ?? 0) - (infos[a]?.lastCommitMs ?? 0) || a.localeCompare(b));
}
