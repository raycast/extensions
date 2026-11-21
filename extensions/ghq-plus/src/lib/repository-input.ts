/** First path segments of github.com that are never a repository owner (deliberately small, not exhaustive). */
export const GITHUB_RESERVED_OWNERS: readonly string[] = [
  "settings",
  "orgs",
  "users",
  "notifications",
  "marketplace",
  "sponsors",
  "topics",
  "collections",
  "trending",
  "features",
  "apps",
  "enterprises",
  "pulls",
  "issues",
];

const OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]+$/;
const SSH_PATTERN = /^git@([^:/]+):([^/]+)\/([^/]+)$/;

function stripGitSuffix(repo: string): string {
  return repo.endsWith(".git") ? repo.slice(0, -".git".length) : repo;
}

/** Tells whether `owner` and `repo` (without its `.git` suffix) can name a github.com repository. */
function isRepositoryName(owner: string, repo: string): boolean {
  return (
    OWNER_PATTERN.test(owner) &&
    REPO_PATTERN.test(repo) &&
    repo !== "." &&
    repo !== ".." &&
    !GITHUB_RESERVED_OWNERS.includes(owner.toLowerCase())
  );
}

/** Detects a github.com repository reference that makes up the whole text and returns its canonical form. */
export function detectGitHubRepository(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0 || /\s/.test(trimmed)) {
    return undefined;
  }

  const ssh = SSH_PATTERN.exec(trimmed);
  if (ssh) {
    const [, host, owner, repo] = ssh;
    // The SSH form is returned as-is: it signals that the user wants an SSH clone.
    return host.toLowerCase() === "github.com" && isRepositoryName(owner, stripGitSuffix(repo)) ? trimmed : undefined;
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port) {
    return undefined;
  }

  // Sub-pages, the query string and the fragment would break `git clone`, so only owner/repo is kept.
  const [owner, rawRepo] = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (owner === undefined || rawRepo === undefined) {
    return undefined;
  }
  const repo = stripGitSuffix(rawRepo);
  return isRepositoryName(owner, repo) ? `https://github.com/${owner}/${repo}` : undefined;
}

/** Canonicalizes a github.com repository reference and passes any other input through, trimmed. */
export function normalizeRepositoryInput(input: string): string {
  return detectGitHubRepository(input) ?? input.trim();
}

/** Validates free-form repository input and returns an error message, or `undefined` when it is valid. */
export function validateRepositoryInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return "Repository is required";
  }
  if (/\s/.test(trimmed)) {
    return "Repository must not contain whitespace";
  }
  return undefined;
}
