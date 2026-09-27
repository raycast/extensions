import { getPreferenceValues } from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { hub } from "./hub";
import { run } from "./shell";
import { Agent, LocalServer, Recipe } from "./types";

export interface Issue {
  kind: "github-issue" | "github-pr" | "linear";
  url: string;
  /** "#123" or "ENG-42". */
  key: string;
  title: string;
  body: string;
  /** "owner/repo" for GitHub. */
  repo?: string;
  number?: number;
  /** For PRs: the branch to work on and whether it lives in a fork. */
  headBranch?: string;
  fromFork?: boolean;
  /** Linear's suggested git branch name. */
  suggestedBranch?: string;
}

const githubPattern = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)/i;
const linearPattern = /^https?:\/\/linear\.app\/[^/\s]+\/issue\/([A-Z][A-Z0-9]*-\d+)/i;

export function isIssueURL(text: string): boolean {
  return githubPattern.test(text.trim()) || linearPattern.test(text.trim());
}

export async function fetchIssue(url: string): Promise<Issue> {
  const trimmed = url.trim();
  const github = trimmed.match(githubPattern);
  if (github) {
    const [, owner, repoName, type, number] = github;
    const repo = `${owner}/${repoName.replace(/\.git$/, "")}`;
    return fetchGitHub(repo, Number(number), type === "pull", trimmed);
  }
  const linear = trimmed.match(linearPattern);
  if (linear) return fetchLinear(linear[1].toUpperCase(), trimmed);
  throw new Error("Paste a GitHub issue or pull request URL, or a Linear issue URL.");
}

interface GitHubIssueJSON {
  title: string;
  body?: string | null;
  pull_request?: unknown;
  head?: { ref: string; repo?: { full_name: string } | null };
}

async function fetchGitHub(repo: string, number: number, isPR: boolean, url: string): Promise<Issue> {
  const path = isPR ? `repos/${repo}/pulls/${number}` : `repos/${repo}/issues/${number}`;
  let data: GitHubIssueJSON;
  try {
    // gh handles private repos with your login.
    data = JSON.parse(await run("gh", ["api", path]));
  } catch {
    const response = await fetch(`https://api.github.com/${path}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? `Couldn't read ${repo}#${number}. For private repos, install and log in to the GitHub CLI (gh auth login).`
          : `GitHub answered ${response.status}.`,
      );
    }
    data = (await response.json()) as GitHubIssueJSON;
  }
  return {
    kind: isPR ? "github-pr" : "github-issue",
    url,
    key: `#${number}`,
    title: data.title,
    body: data.body ?? "",
    repo,
    number,
    headBranch: data.head?.ref,
    fromFork: data.head?.repo ? data.head.repo.full_name.toLowerCase() !== repo.toLowerCase() : false,
  };
}

async function fetchLinear(key: string, url: string): Promise<Issue> {
  const { linearApiKey } = getPreferenceValues<{ linearApiKey?: string }>();
  if (!linearApiKey) throw new Error("Add a Linear API key in the extension's preferences to read Linear issues.");
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: linearApiKey },
    body: JSON.stringify({
      query: "query($id: String!) { issue(id: $id) { identifier title description branchName url } }",
      variables: { id: key },
    }),
  });
  const json = (await response.json()) as {
    data?: { issue?: { identifier: string; title: string; description?: string; branchName?: string } };
    errors?: { message: string }[];
  };
  const issue = json.data?.issue;
  if (!issue) throw new Error(json.errors?.[0]?.message ?? `Couldn't read ${key} from Linear.`);
  return {
    kind: "linear",
    url,
    key: issue.identifier,
    title: issue.title,
    body: issue.description ?? "",
    suggestedBranch: issue.branchName,
  };
}

export function slug(text: string, max = 40): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

export function branchFor(issue: Issue): string {
  if (issue.kind === "github-pr" && issue.headBranch && !issue.fromFork) return issue.headBranch;
  if (issue.kind === "github-pr") return `pr-${issue.number}-${slug(issue.title, 30)}`;
  if (issue.suggestedBranch) return issue.suggestedBranch;
  return `agent/${issue.kind === "linear" ? issue.key.toLowerCase() : issue.number}-${slug(issue.title, 30)}`;
}

export function briefFor(issue: Issue): string {
  const header = `${issue.kind === "github-pr" ? "Pull request" : "Issue"} ${issue.key}: ${issue.title}\n${issue.url}`;
  return `${header}\n\n${issue.body.trim() || "(no description)"}`;
}

export function promptFor(issue: Issue): string {
  if (issue.kind === "github-pr") {
    return `Address the review comments on ${issue.url}. Read them with \`gh pr view ${issue.number} --comments\` (and the inline review threads), make the changes, run the tests, and push to this branch.`;
  }
  return `Work on ${issue.key}: ${issue.title} (${issue.url}). Your brief has the full description. Plan briefly, implement it, add or update tests, and summarize what you changed.`;
}

/** Local git repos Office Space knows about, plus repos in your code folders. */
export async function knownRepos(): Promise<string[]> {
  const found = new Set<string>();
  const [agents, servers, recipes] = await Promise.all([
    hub<Agent[]>(["agents", "--all"]).catch(() => [] as Agent[]),
    hub<LocalServer[]>(["servers"]).catch(() => [] as LocalServer[]),
    hub<Recipe[]>(["recipes"]).catch(() => [] as Recipe[]),
  ]);
  for (const agent of agents) if (agent.project && !agent.worktreePath) found.add(agent.project.rootPath);
  for (const server of servers) if (server.project) found.add(server.project.rootPath);
  for (const recipe of recipes) found.add(recipe.folder.replace(/^~(?=\/)/, homedir()));

  const { codeFolders } = getPreferenceValues<{ codeFolders?: string }>();
  const roots = (codeFolders ?? "")
    .split(",")
    .map((folder) => folder.trim().replace(/^~(?=$|\/)/, homedir()))
    .filter(Boolean);
  for (const root of roots) {
    for (const repo of await gitReposIn(root, 2)) found.add(repo);
  }
  return [...found].filter((path) => !path.includes(".worktrees/"));
}

async function gitReposIn(folder: string, depth: number): Promise<string[]> {
  try {
    if ((await stat(join(folder, ".git")).catch(() => undefined)) !== undefined) return [folder];
    if (depth === 0) return [];
    const entries = await readdir(folder, { withFileTypes: true });
    const nested = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules")
        .map((entry) => gitReposIn(join(folder, entry.name), depth - 1)),
    );
    return nested.flat();
  } catch {
    return [];
  }
}

/** True when a remote URL points at `owner/repo` on GitHub (SSH or HTTPS). */
export function remoteMatches(remote: string, repo: string): boolean {
  const normalized = remote
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const wanted = repo.toLowerCase();
  return normalized.endsWith(wanted) && /[/:]$/.test(normalized.slice(0, normalized.length - wanted.length));
}

/** The local clone whose origin is `owner/repo`, if any. Reads the configured
 *  URL as written (not after `insteadOf` rewrites). */
export async function findClone(repos: string[], repo: string): Promise<string | undefined> {
  const remotes = await Promise.all(
    repos.map(async (path) => ({
      path,
      remote: await run("git", ["-C", path, "config", "--get", "remote.origin.url"]).catch(() => ""),
    })),
  );
  return remotes.find(({ remote }) => remoteMatches(remote, repo))?.path;
}

/** Makes the PR's branch available locally so the worktree gets the PR's code. */
export async function fetchPullRequest(folder: string, issue: Issue, branch: string): Promise<void> {
  if (issue.kind !== "github-pr" || issue.number === undefined) return;
  const exists = await run("git", ["-C", folder, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
    .then(() => true)
    .catch(() => false);
  if (exists) return;
  await run("git", ["-C", folder, "fetch", "origin", `pull/${issue.number}/head:${branch}`], { timeout: 60_000 });
}
