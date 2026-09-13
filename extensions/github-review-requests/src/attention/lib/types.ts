/**
 * Shared data shapes. These mirror the structures flex-review's Go packages
 * expose (`internal/gh`, `internal/config`) so the two stay conceptually in
 * sync — only the transport and the UI differ.
 */

/** A PR label. */
export type Label = {
  name: string;
  color: string;
};

/**
 * A flattened pull request from the search query, enriched with the attention
 * signals computed client-side from its review threads.
 */
export type PullRequest = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  repository: string;
  author: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** APPROVED | CHANGES_REQUESTED | REVIEW_REQUIRED | "" */
  reviewDecision: string;
  labels: Label[];
  assignees: string[];
  /** Requested reviewers: user logins, and team slugs prefixed with "@". */
  reviewers: string[];
  comments: number;

  // Attention signals derived from review threads.
  /** Total review threads. */
  threads: number;
  /** Unresolved review threads. */
  unresolved: number;
  /** Unresolved threads where the ball is in my court. */
  awaitingReply: number;
  /** Author of the most recent comment awaiting my reply. */
  latestReplier: string;
  /**
   * Deep link to that comment (…#issuecomment-123, …#discussion_r456), so
   * opening it lands on the message rather than the top of the pull request.
   * Empty when nothing is awaiting a reply.
   */
  awaitingUrl: string;
  /**
   * When that comment was posted, so "waiting 18 days for your reply" is
   * answerable. Empty when nothing is awaiting a reply.
   */
  awaitingSince: string;
  /** Most recent thread/PR activity time (ISO 8601). */
  lastActivity: string;
  /** Activity newer than the last time I looked at this PR. */
  newSince: boolean;
};

/** GitHub's GraphQL rate limit snapshot. */
export type RateLimit = {
  remaining: number;
  resetAt: string;
  cost: number;
};

/** The result of one search query. */
export type SearchResult = {
  issueCount: number;
  prs: PullRequest[];
  rateLimit?: RateLimit;
};

/** The authenticated user, their orgs, and their team memberships. */
export type Viewer = {
  login: string;
  /** Org logins the token can see. */
  orgs: string[];
  /** Teams as "org/slug". */
  teams: string[];
};

/** A single comment in a conversation or review thread. */
export type Comment = {
  author: string;
  body: string;
  createdAt: string;
};

/** A submitted review with its body. */
export type ReviewDetail = {
  author: string;
  state: string;
  body: string;
  createdAt: string;
};

/** An inline review thread on a file/line, with its comments. */
export type ThreadDetail = {
  /** Node id, used by the reply/resolve mutations. */
  id: string;
  /** Link to the thread on GitHub (anchored at its first comment). */
  url: string;
  path: string;
  line: number;
  resolved: boolean;
  outdated: boolean;
  comments: Comment[];
};

/** One normalized event in a PR's history. */
export type TimelineEvent = {
  /** opened | comment | review-approved | ready | merged | … */
  kind: string;
  actor: string;
  at: string;
  /** Snippet, label name, new title, or reviewer — depends on `kind`. */
  text?: string;
  url?: string;
};

/** The full on-demand conversation for one PR. */
export type PRDetail = {
  /** PR node id, used by the addComment mutation. */
  id: string;
  body: string;
  reviews: ReviewDetail[];
  comments: Comment[];
  threads: ThreadDetail[];
  timeline: TimelineEvent[];
};

/** A repository reference. */
export type RepoRef = {
  owner: string;
  name: string;
};

/** Renders a repo reference as owner/name. */
export function nameWithOwner(r: RepoRef): string {
  return `${r.owner}/${r.name}`;
}

/** Parses an "owner/name" identifier. Returns undefined when malformed. */
export function parseRepoRef(s: string): RepoRef | undefined {
  const parts = s.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined;
  return { owner: parts[0], name: parts[1] };
}
