import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GhAvailability = "ok" | "unauthenticated" | "missing";

export type CheckStatus =
  "success" | "failure" | "pending" | "neutral" | "none";

export type PullRequest = {
  number: number;
  title: string;
  url: string;
  author: string;
  headRefName: string;
  isDraft: boolean;
  mergeable: string;
  checks: CheckStatus;
  updatedAt: string;
};

export type Issue = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
};

export type GitHubRepo = { owner: string; name: string };

function isMissing(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function stderrOf(error: unknown): string {
  if (error !== null && typeof error === "object" && "stderr" in error) {
    const value = (error as { stderr?: unknown }).stderr;
    if (typeof value === "string") return value;
  }
  return "";
}

async function runGh(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gh", args, {
    cwd,
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";
  const { stdout } = await execFileAsync(gitExecutable, ["-C", cwd, ...args], {
    timeout: 10_000,
  });
  return stdout;
}

export async function ghAvailability(): Promise<GhAvailability> {
  try {
    await execFileAsync("gh", ["auth", "status", "--hostname", "github.com"], {
      timeout: 10_000,
    });
    return "ok";
  } catch (error) {
    if (isMissing(error)) return "missing";
    const stderr = stderrOf(error).toLowerCase();
    if (stderr.includes("not logged") || stderr.includes("not authenticated"))
      return "unauthenticated";
    return "unauthenticated";
  }
}

const REMOTE_PATTERNS: RegExp[] = [
  /^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?\/?$/,
  /^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?\/?$/,
];

export async function resolveGitHubRepo(
  repoRoot: string,
): Promise<GitHubRepo | undefined> {
  let raw: string;
  try {
    raw = (await runGit(repoRoot, ["remote", "get-url", "origin"])).trim();
  } catch {
    return undefined;
  }
  for (const pattern of REMOTE_PATTERNS) {
    const match = raw.match(pattern);
    if (match) return { owner: match[1], name: match[2] };
  }
  return undefined;
}

function classifyRollup(rollup: unknown): CheckStatus {
  if (!Array.isArray(rollup) || rollup.length === 0) return "none";
  let sawFailure = false;
  let sawPending = false;
  for (const entry of rollup) {
    if (typeof entry !== "object" || entry === null) continue;
    const state =
      (entry as { state?: string; conclusion?: string }).conclusion ??
      (entry as { state?: string }).state ??
      "";
    const s = String(state).toUpperCase();
    if (
      s === "FAILURE" ||
      s === "TIMED_OUT" ||
      s === "STARTUP_FAILURE" ||
      s === "ACTION_REQUIRED"
    ) {
      sawFailure = true;
    } else if (s === "PENDING" || s === "QUEUED" || s === "IN_PROGRESS") {
      sawPending = true;
    }
  }
  if (sawFailure) return "failure";
  if (sawPending) return "pending";
  return "success";
}

function parsePullRequests(json: string): PullRequest[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) return [];
  const result: PullRequest[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const p = item as {
      number?: number;
      title?: string;
      url?: string;
      author?: { login?: string };
      headRefName?: string;
      isDraft?: boolean;
      mergeable?: string;
      statusCheckRollup?: unknown;
      updatedAt?: string;
    };
    if (
      typeof p.number !== "number" ||
      typeof p.title !== "string" ||
      typeof p.url !== "string"
    )
      continue;
    result.push({
      number: p.number,
      title: p.title,
      url: p.url,
      author: p.author?.login ?? "",
      headRefName: p.headRefName ?? "",
      isDraft: Boolean(p.isDraft),
      mergeable: typeof p.mergeable === "string" ? p.mergeable : "UNKNOWN",
      checks: classifyRollup(p.statusCheckRollup),
      updatedAt: p.updatedAt ?? "",
    });
  }
  return result;
}

function parseIssues(json: string): Issue[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) return [];
  const result: Issue[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const i = item as {
      number?: number;
      title?: string;
      url?: string;
      updatedAt?: string;
    };
    if (
      typeof i.number !== "number" ||
      typeof i.title !== "string" ||
      typeof i.url !== "string"
    )
      continue;
    result.push({
      number: i.number,
      title: i.title,
      url: i.url,
      updatedAt: i.updatedAt ?? "",
    });
  }
  return result;
}

const PR_FIELDS =
  "number,title,url,author,headRefName,isDraft,mergeable,statusCheckRollup,updatedAt";
const ISSUE_FIELDS = "number,title,url,updatedAt";

export async function listPullRequests(
  repoRoot: string,
  repo: GitHubRepo,
): Promise<PullRequest[]> {
  const stdout = await runGh(repoRoot, [
    "pr",
    "list",
    "--repo",
    `${repo.owner}/${repo.name}`,
    "--state",
    "open",
    "--limit",
    "50",
    "--json",
    PR_FIELDS,
  ]);
  return parsePullRequests(stdout);
}

export async function listAssignedIssues(
  repoRoot: string,
  repo: GitHubRepo,
): Promise<Issue[]> {
  const stdout = await runGh(repoRoot, [
    "issue",
    "list",
    "--repo",
    `${repo.owner}/${repo.name}`,
    "--assignee",
    "@me",
    "--state",
    "open",
    "--limit",
    "50",
    "--json",
    ISSUE_FIELDS,
  ]);
  return parseIssues(stdout);
}

export async function listReviewRequests(
  repoRoot: string,
  repo: GitHubRepo,
): Promise<PullRequest[]> {
  const stdout = await runGh(repoRoot, [
    "pr",
    "list",
    "--repo",
    `${repo.owner}/${repo.name}`,
    "--search",
    "review-requested:@me is:open",
    "--limit",
    "50",
    "--json",
    PR_FIELDS,
  ]);
  return parsePullRequests(stdout);
}

export async function createPullRequestWeb(repoRoot: string): Promise<void> {
  await execFileAsync("gh", ["pr", "create", "--web"], {
    cwd: repoRoot,
    timeout: 30_000,
  });
}
