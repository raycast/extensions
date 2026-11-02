// Pure helpers for AI Chat mentions. Keep this file free of runtime imports so `node --experimental-strip-types`
// can test it directly.

export const MAX_MENTIONS = 50;
/** Search rows per keystroke. Kept below the mention cap so typing stays fast. */
export const MENTION_SEARCH_SIZE = 20;
const MAX_BODY_LENGTH = 8000;

type Author = { login: string } | null | undefined;

export type IssueMention = {
  number: number;
  title: string;
  closed: boolean;
  stateReason: string | null;
  repository: { nameWithOwner: string };
  author?: Author;
};

export type PullRequestMention = {
  number: number;
  title: string;
  closed: boolean;
  merged: boolean;
  isDraft: boolean;
  repository: { nameWithOwner: string };
  author?: Author;
};

export type RepositoryMention = {
  nameWithOwner: string;
  description: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  owner: { avatarUrl: string };
};

export type MentionItem = { title: string; uri: string; description: string; icon: string };

const OWNER = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})";
const REPO = "[A-Za-z0-9._-]{1,100}";
const NUMBER = "[1-9][0-9]{0,9}";

const ITEM_URI = new RegExp(`^github://(issues|pulls)/(${OWNER})/(${REPO})/(${NUMBER})$`);
const REPO_URI = new RegExp(`^github://repos/(${OWNER})/(${REPO})$`);
const REFERENCE = new RegExp(
  `^(?:https?://github\\.com/)?(${OWNER})/(${REPO})(?:#|/(?:issues|pull)/)(${NUMBER})(?:[/?#].*)?$`,
  "i",
);

export type MentionResource =
  | { kind: "issue" | "pullRequest"; owner: string; name: string; number: number }
  | { kind: "repository"; owner: string; name: string };

function isRepoName(name: string) {
  return name !== "." && name !== "..";
}

export function parseMentionUri(uri: string): MentionResource {
  const item = ITEM_URI.exec(uri);
  if (item && isRepoName(item[3])) {
    return {
      kind: item[1] === "issues" ? "issue" : "pullRequest",
      owner: item[2],
      name: item[3],
      number: Number(item[4]),
    };
  }
  const repo = REPO_URI.exec(uri);
  if (repo && isRepoName(repo[2])) return { kind: "repository", owner: repo[1], name: repo[2] };
  throw new Error("Invalid GitHub mention URI.");
}

/** Recognizes `owner/repo#123` and issue or pull request URLs, which GitHub search cannot look up by number. */
export function parseItemReference(query: string): { owner: string; name: string; number: number } | undefined {
  const match = REFERENCE.exec(query.trim());
  if (!match || !isRepoName(match[2])) return undefined;
  return { owner: match[1], name: match[2], number: Number(match[3]) };
}

/**
 * Without a query, lists open items you're involved in, most recently updated first. A typed query searches
 * everything you can access. `#123` is not a search qualifier, so it is searched as a plain number.
 */
export function buildItemSearchQuery(type: "issue" | "pr", query: string): string {
  const text = query.replace(/(^|\s)#(\d+)(?=\s|$)/g, "$1$2").trim();
  if (!text) return `is:${type} is:open archived:false involves:@me sort:updated-desc`;
  return `is:${type} archived:false ${text}`;
}

/**
 * Repository search omits forks unless the query sets `fork:`. The default mention list includes them, so a
 * typed query includes forks too unless the user already supplied a fork qualifier.
 */
export function buildRepositorySearchQuery(query: string): string {
  const text = query.trim();
  if (!text || /(?:^|\s)-?fork:/i.test(text)) return text;
  return `${text} fork:true`;
}

function compact(value: string | null | undefined, length = 120) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

function splitNameWithOwner(nameWithOwner: string) {
  const [owner, name] = nameWithOwner.split("/");
  return { owner, name };
}

function describe(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" · ");
}

export function issueStatus(issue: Pick<IssueMention, "closed" | "stateReason">) {
  if (!issue.closed) return "Open";
  if (issue.stateReason === "NOT_PLANNED") return "Closed as not planned";
  if (issue.stateReason === "DUPLICATE") return "Closed as duplicate";
  return "Closed";
}

export function pullRequestStatus(
  pullRequest: Pick<PullRequestMention, "closed" | "merged" | "isDraft">,
): "Open" | "Draft" | "Merged" | "Closed" {
  if (pullRequest.merged) return "Merged";
  if (pullRequest.closed) return "Closed";
  return pullRequest.isDraft ? "Draft" : "Open";
}

export function toIssueMention(issue: IssueMention): MentionItem {
  const { owner, name } = splitNameWithOwner(issue.repository.nameWithOwner);
  return {
    title: issue.title,
    uri: `github://issues/${owner}/${name}/${issue.number}`,
    description: describe(`${issue.repository.nameWithOwner}#${issue.number}`, issueStatus(issue), issue.author?.login),
    icon: issue.closed ? "issue-closed.svg" : "issue-open.svg",
  };
}

const PULL_REQUEST_ICONS: Record<ReturnType<typeof pullRequestStatus>, string> = {
  Open: "pull-request-open.svg",
  Draft: "pull-request-draft.svg",
  Merged: "pull-request-merged.svg",
  Closed: "pull-request-closed.svg",
};

export function toPullRequestMention(pullRequest: PullRequestMention): MentionItem {
  const { owner, name } = splitNameWithOwner(pullRequest.repository.nameWithOwner);
  const status = pullRequestStatus(pullRequest);
  return {
    title: pullRequest.title,
    uri: `github://pulls/${owner}/${name}/${pullRequest.number}`,
    description: describe(
      `${pullRequest.repository.nameWithOwner}#${pullRequest.number}`,
      status,
      pullRequest.author?.login,
    ),
    icon: PULL_REQUEST_ICONS[status],
  };
}

export function toRepositoryMention(repository: RepositoryMention): MentionItem {
  return {
    title: repository.nameWithOwner,
    uri: `github://repos/${repository.nameWithOwner}`,
    description: describe(
      repository.isPrivate && "Private",
      repository.isArchived && "Archived",
      compact(repository.description),
    ),
    icon: repository.owner.avatarUrl || "book.svg",
  };
}

/** GitHub search returns an empty object for nodes of other types, so keep only the ones with the expected key. */
export function mentionNodes<T>(nodes: ReadonlyArray<unknown> | null | undefined, key: keyof T & string): T[] {
  return (nodes ?? []).filter((node): node is T => typeof node === "object" && node !== null && key in node);
}

export function toMentions<T>(items: readonly T[], map: (item: T) => MentionItem): MentionItem[] {
  const seen = new Set<string>();
  const result: MentionItem[] = [];
  for (const item of items) {
    const mention = map(item);
    if (seen.has(mention.uri)) continue;
    seen.add(mention.uri);
    result.push(mention);
    if (result.length === MAX_MENTIONS) break;
  }
  return result;
}

function truncateBody(body: string | null | undefined) {
  if (!body) return undefined;
  return body.length > MAX_BODY_LENGTH ? `${body.slice(0, MAX_BODY_LENGTH)}\n\n[Truncated]` : body;
}

type RestUser = { login?: string } | null | undefined;
type RestTeam = { slug?: string } | null | undefined;
type RestLabel = string | { name?: string };

export type RestIssue = {
  number: number;
  title: string;
  state: string;
  state_reason?: string | null;
  html_url: string;
  body?: string | null;
  user?: RestUser;
  assignees?: RestUser[] | null;
  labels?: RestLabel[];
  milestone?: { title?: string } | null;
  comments?: number;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  pull_request?: unknown;
};

export type RestPullRequest = {
  number: number;
  title: string;
  state: string;
  draft?: boolean;
  merged?: boolean;
  merged_at?: string | null;
  mergeable_state?: string;
  html_url: string;
  body?: string | null;
  user?: RestUser;
  assignees?: RestUser[] | null;
  requested_reviewers?: RestUser[] | null;
  requested_teams?: RestTeam[] | null;
  labels?: RestLabel[];
  milestone?: { title?: string } | null;
  base: { ref: string };
  head: { ref: string };
  additions?: number;
  deletions?: number;
  changed_files?: number;
  commits?: number;
  comments?: number;
  review_comments?: number;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
};

export type RestRepository = {
  full_name: string;
  description?: string | null;
  html_url: string;
  homepage?: string | null;
  private?: boolean;
  archived?: boolean;
  fork?: boolean;
  default_branch?: string;
  language?: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  pushed_at?: string | null;
  updated_at?: string | null;
};

const logins = (users: RestUser[] | null | undefined) =>
  (users ?? []).flatMap((user) => (user?.login ? [user.login] : []));
const teamSlugs = (teams: RestTeam[] | null | undefined) =>
  (teams ?? []).flatMap((team) => (team?.slug ? [team.slug] : []));
const labelNames = (labels: RestLabel[] | undefined) =>
  (labels ?? []).flatMap((label) => {
    const name = typeof label === "string" ? label : label.name;
    return name ? [name] : [];
  });

function json(value: Record<string, unknown>) {
  return { text: JSON.stringify(value, null, 2), mimeType: "application/json" };
}

export function serializeIssue(repository: string, issue: RestIssue) {
  return json({
    repository,
    number: issue.number,
    title: issue.title,
    status: issueStatus({ closed: issue.state === "closed", stateReason: issue.state_reason?.toUpperCase() ?? null }),
    url: issue.html_url,
    author: issue.user?.login,
    assignees: logins(issue.assignees),
    labels: labelNames(issue.labels),
    milestone: issue.milestone?.title,
    comments: issue.comments,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at ?? undefined,
    body: truncateBody(issue.body),
  });
}

export function serializePullRequest(repository: string, pullRequest: RestPullRequest) {
  return json({
    repository,
    number: pullRequest.number,
    title: pullRequest.title,
    status: pullRequestStatus({
      closed: pullRequest.state === "closed",
      merged: pullRequest.merged === true || Boolean(pullRequest.merged_at),
      isDraft: pullRequest.draft === true,
    }),
    url: pullRequest.html_url,
    author: pullRequest.user?.login,
    base: pullRequest.base.ref,
    head: pullRequest.head.ref,
    mergeableState: pullRequest.mergeable_state,
    assignees: logins(pullRequest.assignees),
    requestedReviewers: [...logins(pullRequest.requested_reviewers), ...teamSlugs(pullRequest.requested_teams)],
    labels: labelNames(pullRequest.labels),
    milestone: pullRequest.milestone?.title,
    commits: pullRequest.commits,
    changedFiles: pullRequest.changed_files,
    additions: pullRequest.additions,
    deletions: pullRequest.deletions,
    comments: pullRequest.comments,
    reviewComments: pullRequest.review_comments,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
    closedAt: pullRequest.closed_at ?? undefined,
    body: truncateBody(pullRequest.body),
  });
}

export function serializeRepository(repository: RestRepository) {
  return json({
    name: repository.full_name,
    description: repository.description ?? undefined,
    url: repository.html_url,
    homepage: repository.homepage || undefined,
    private: repository.private === true,
    archived: repository.archived === true,
    fork: repository.fork === true,
    defaultBranch: repository.default_branch,
    language: repository.language ?? undefined,
    topics: repository.topics ?? [],
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssuesAndPullRequests: repository.open_issues_count,
    pushedAt: repository.pushed_at ?? undefined,
    updatedAt: repository.updated_at ?? undefined,
  });
}
