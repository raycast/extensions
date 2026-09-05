/**
 * The GitHub queries that power the extension. These are direct ports of the
 * GraphQL documents in flex-review's internal/gh package, so the Raycast
 * extension and the TUI see exactly the same data.
 */
import { normalizeAuthor } from "./config";
import { demoDetail, demoRepos, isDemoMode } from "./demo";
import { graphql } from "./graphql";
import { maxResults } from "./preferences";
import type {
  Comment,
  PRDetail,
  PullRequest,
  RepoRef,
  ReviewDetail,
  SearchResult,
  ThreadDetail,
  TimelineEvent,
  Viewer,
} from "./types";

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------

const VIEWER_LOGIN_QUERY = `query { viewer { login } }`;

const VIEWER_TEAMS_QUERY = `
query($login: String!) {
  viewer {
    organizations(first: 50) {
      nodes {
        login
        teams(first: 100, userLogins: [$login]) {
          nodes { slug }
        }
      }
    }
  }
}`;

/**
 * Resolves the current login and team memberships. The team lookup is
 * best-effort: if it fails (e.g. missing read:org on some org) the login is
 * still returned, with whatever teams were found.
 */
export async function fetchViewer(): Promise<Viewer> {
  const login = await graphql<{ viewer: { login: string } }>(VIEWER_LOGIN_QUERY);
  const viewer: Viewer = { login: login.viewer.login, orgs: [], teams: [] };

  try {
    const data = await graphql<{
      viewer: {
        organizations: { nodes: { login: string; teams: { nodes: { slug: string }[] } }[] };
      };
    }>(VIEWER_TEAMS_QUERY, { login: viewer.login });

    for (const org of data.viewer.organizations.nodes) {
      viewer.orgs.push(org.login);
      for (const team of org.teams.nodes) {
        viewer.teams.push(`${org.login}/${team.slug}`);
      }
    }
  } catch {
    // Non-fatal: return the login with no teams.
  }
  return viewer;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * The single query behind every category. Only $q changes between them. It
 * pulls review threads too, so comment/reply attention signals can be computed
 * client-side.
 */
const SEARCH_QUERY = `
query($q: String!, $first: Int!, $after: String) {
  rateLimit { remaining resetAt cost }
  search(query: $q, type: ISSUE, first: $first, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number
        title
        url
        isDraft
        createdAt
        updatedAt
        author { login }
        repository { nameWithOwner }
        additions
        deletions
        changedFiles
        reviewDecision
        labels(first: 10) { nodes { name color } }
        assignees(first: 10) { nodes { login } }
        reviewRequests(first: 10) {
          nodes { requestedReviewer { __typename ... on User { login } ... on Team { slug } } }
        }
        comments(last: 5) {
          totalCount
          nodes { author { login } createdAt viewerDidAuthor url }
        }
        reviews(last: 5) {
          nodes { author { login } createdAt viewerDidAuthor state url }
        }
        reviewThreads(first: 15) {
          nodes {
            isResolved
            isOutdated
            comments(last: 5) {
              nodes { author { login } createdAt viewerDidAuthor url }
            }
          }
        }
      }
    }
  }
}`;

type ThreadCommentNode = {
  author: { login: string } | null;
  createdAt: string;
  viewerDidAuthor: boolean;
  /** Deep link to this specific comment, e.g. …/pull/12#discussion_r345. */
  url?: string;
};

type ReviewThreadNode = {
  isResolved: boolean;
  isOutdated: boolean;
  comments: { nodes: ThreadCommentNode[] };
};

type SearchNode = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  author: { login: string } | null;
  repository: { nameWithOwner: string };
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision: string | null;
  labels: { nodes: { name: string; color: string }[] };
  assignees: { nodes: { login: string }[] };
  reviewRequests: { nodes: { requestedReviewer: { login?: string; slug?: string } | null }[] };
  comments: { totalCount: number; nodes: ThreadCommentNode[] };
  reviews: { nodes: (ThreadCommentNode & { state: string })[] };
  reviewThreads: { nodes: ReviewThreadNode[] };
};

type SearchData = {
  rateLimit: { remaining: number; resetAt: string; cost: number };
  search: {
    issueCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: (SearchNode | Record<string, never>)[];
  };
};

/**
 * Derives comment/reply signals for a PR, relative to the authenticated viewer.
 *
 * Two places a conversation can be waiting on you, and both count:
 *
 *  1. **Inline review threads** — comments pinned to a diff line.
 *  2. **The PR conversation** — top-level comments and review bodies.
 *
 * Only (1) used to be considered, which made the whole signal invisible to
 * teams that discuss in the PR body rather than on diff lines: someone asks
 * you a question on your own PR, and nothing ever flags it.
 *
 * Comments from ignored authors are skipped, so a Linear or CI bot posting a
 * link doesn't make every pull request look like it needs an answer.
 */
function computeAttention(
  pr: PullRequest,
  node: Pick<SearchNode, "comments" | "reviews" | "reviewThreads">,
  viewerLogin: string,
  isIgnored: (login: string) => boolean,
): void {
  const isMyPR = Boolean(viewerLogin) && pr.author === viewerLogin;
  let lastActivity = pr.updatedAt;
  let latestAwaiting = "";

  const noteAwaiting = (comment: ThreadCommentNode) => {
    pr.awaitingReply++;
    if (comment.createdAt > latestAwaiting) {
      latestAwaiting = comment.createdAt;
      pr.latestReplier = comment.author?.login ?? "";
      // Deep link to the message itself, so opening it lands on the thing that
      // needs an answer rather than at the top of a long pull request.
      pr.awaitingUrl = comment.url ?? "";
      pr.awaitingSince = comment.createdAt;
    }
  };

  // 1. Inline review threads.
  for (const thread of node.reviewThreads.nodes) {
    pr.threads++;
    const comments = thread.comments.nodes;
    if (comments.length === 0) continue;

    const last = comments[comments.length - 1];
    if (last.createdAt > lastActivity) lastActivity = last.createdAt;
    if (thread.isResolved) continue;
    pr.unresolved++;

    const iCommented = comments.some((c) => c.viewerDidAuthor);
    // A thread awaits my reply when it's unresolved, the last word isn't mine,
    // and I'm involved — either I commented in it or it's my PR.
    if (!last.viewerDidAuthor && (iCommented || isMyPR)) {
      noteAwaiting(last);
    }
  }

  // 2. The PR conversation: top-level comments and submitted reviews, merged
  // in time order so "who had the last word" accounts for both.
  const conversation = [...node.comments.nodes, ...node.reviews.nodes]
    .filter((c) => c.viewerDidAuthor || !isIgnored(c.author?.login ?? ""))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const lastInConversation = conversation[conversation.length - 1];
  if (lastInConversation) {
    if (lastInConversation.createdAt > lastActivity) lastActivity = lastInConversation.createdAt;

    const iParticipated = conversation.some((c) => c.viewerDidAuthor);
    // The conversation counts as one outstanding thread, however many messages
    // are in it.
    if (!lastInConversation.viewerDidAuthor && (iParticipated || isMyPR)) {
      noteAwaiting(lastInConversation);
    }
  }

  pr.lastActivity = lastActivity;
}

function isPullRequestNode(node: SearchNode | Record<string, never>): node is SearchNode {
  return typeof (node as SearchNode).number === "number";
}

/**
 * Runs a GitHub search query, paginating up to `limit` pull requests.
 *
 * `ignoredAuthors` is used when weighing attention signals, so a bot's comment
 * never makes a pull request look like it's waiting on you.
 */
export async function search(
  q: string,
  viewerLogin: string,
  limit = maxResults(),
  ignoredAuthors: string[] = [],
): Promise<SearchResult> {
  const ignored = new Set(ignoredAuthors.map(normalizeAuthor));
  const isIgnored = (login: string) => Boolean(login) && ignored.has(normalizeAuthor(login));

  const result: SearchResult = { issueCount: 0, prs: [] };
  let after: string | undefined;

  while (result.prs.length < limit) {
    // Thread-heavy query: keep pages modest for cost.
    const pageSize = Math.min(limit - result.prs.length, 50);
    const data = await graphql<SearchData>(SEARCH_QUERY, { q, first: pageSize, ...(after ? { after } : {}) });

    result.issueCount = data.search.issueCount;
    result.rateLimit = data.rateLimit;

    for (const node of data.search.nodes) {
      // Search can return issues too; the inline fragment leaves those empty.
      if (!isPullRequestNode(node)) continue;

      const pr: PullRequest = {
        number: node.number,
        title: node.title,
        url: node.url,
        isDraft: node.isDraft,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        repository: node.repository.nameWithOwner,
        author: node.author?.login ?? "",
        additions: node.additions,
        deletions: node.deletions,
        changedFiles: node.changedFiles,
        reviewDecision: node.reviewDecision ?? "",
        labels: node.labels.nodes,
        assignees: node.assignees.nodes.map((a) => a.login),
        reviewers: node.reviewRequests.nodes.flatMap((r) => {
          const reviewer = r.requestedReviewer;
          if (reviewer?.login) return [reviewer.login];
          if (reviewer?.slug) return [`@${reviewer.slug}`];
          return [];
        }),
        comments: node.comments.totalCount,
        threads: 0,

        unresolved: 0,
        awaitingReply: 0,
        latestReplier: "",
        awaitingUrl: "",
        awaitingSince: "",
        lastActivity: node.updatedAt,
        newSince: false,
      };
      computeAttention(pr, node, viewerLogin, isIgnored);
      result.prs.push(pr);
    }

    if (!data.search.pageInfo.hasNextPage || !data.search.pageInfo.endCursor) break;
    after = data.search.pageInfo.endCursor;
  }

  return result;
}

// ---------------------------------------------------------------------------
// PR detail
// ---------------------------------------------------------------------------

const PR_DETAIL_QUERY = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      bodyText
      createdAt
      author { login }
      reviews(first: 50) {
        nodes { author { login } state bodyText createdAt }
      }
      comments(first: 100) {
        nodes { author { login } bodyText createdAt }
      }
      reviewThreads(first: 60) {
        nodes {
          id isResolved isOutdated path line
          comments(first: 50) { nodes { author { login } bodyText createdAt url } }
        }
      }
      timelineItems(first: 100, itemTypes: [
        PULL_REQUEST_REVIEW, ISSUE_COMMENT, READY_FOR_REVIEW_EVENT, CONVERT_TO_DRAFT_EVENT,
        REVIEW_REQUESTED_EVENT, HEAD_REF_FORCE_PUSHED_EVENT, MERGED_EVENT, CLOSED_EVENT,
        REOPENED_EVENT, LABELED_EVENT, RENAMED_TITLE_EVENT
      ]) {
        nodes {
          __typename
          ... on PullRequestReview { author { login } state createdAt bodyText url }
          ... on IssueComment { author { login } createdAt bodyText url }
          ... on ReadyForReviewEvent { actor { login } createdAt }
          ... on ConvertToDraftEvent { actor { login } createdAt }
          ... on ReviewRequestedEvent { actor { login } createdAt requestedReviewer { __typename ... on User { login } ... on Team { slug } } }
          ... on HeadRefForcePushedEvent { actor { login } createdAt }
          ... on MergedEvent { actor { login } createdAt }
          ... on ClosedEvent { actor { login } createdAt }
          ... on ReopenedEvent { actor { login } createdAt }
          ... on LabeledEvent { actor { login } createdAt label { name } }
          ... on RenamedTitleEvent { actor { login } createdAt currentTitle }
        }
      }
    }
  }
}`;

const MAX_BODY = 2000;
const MAX_SNIPPET = 280;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

type TimelineNode = {
  __typename: string;
  createdAt: string;
  actor?: { login: string } | null;
  author?: { login: string } | null;
  state?: string;
  bodyText?: string;
  url?: string;
  currentTitle?: string;
  label?: { name: string } | null;
  requestedReviewer?: { login?: string; slug?: string } | null;
};

/** Maps one GraphQL timeline item onto a normalized event, or null to skip it. */
function mapTimelineItem(node: TimelineNode): TimelineEvent | null {
  const actor = node.actor?.login ?? node.author?.login ?? "";
  const base = { actor, at: node.createdAt, url: node.url };

  switch (node.__typename) {
    case "PullRequestReview": {
      const kind =
        node.state === "APPROVED"
          ? "review-approved"
          : node.state === "CHANGES_REQUESTED"
            ? "review-changes"
            : node.state === "DISMISSED"
              ? "review-dismissed"
              : "review-commented";
      return { ...base, kind, text: truncate(node.bodyText ?? "", MAX_SNIPPET) };
    }
    case "IssueComment":
      return { ...base, kind: "comment", text: truncate(node.bodyText ?? "", MAX_SNIPPET) };
    case "ReadyForReviewEvent":
      return { ...base, kind: "ready" };
    case "ConvertToDraftEvent":
      return { ...base, kind: "draft" };
    case "ReviewRequestedEvent": {
      const reviewer = node.requestedReviewer;
      const text = reviewer?.login ? `@${reviewer.login}` : reviewer?.slug ? `@${reviewer.slug}` : undefined;
      return { ...base, kind: "review-requested", text };
    }
    case "HeadRefForcePushedEvent":
      return { ...base, kind: "force-push" };
    case "MergedEvent":
      return { ...base, kind: "merged" };
    case "ClosedEvent":
      return { ...base, kind: "closed" };
    case "ReopenedEvent":
      return { ...base, kind: "reopened" };
    case "LabeledEvent":
      return { ...base, kind: "label", text: node.label?.name };
    case "RenamedTitleEvent":
      return { ...base, kind: "rename", text: truncate(node.currentTitle ?? "", 120) };
    default:
      return null;
  }
}

/** Fetches the full conversation for owner/name#number. */
export async function pullRequestDetail(owner: string, name: string, number: number): Promise<PRDetail> {
  if (await isDemoMode()) return demoDetail();

  const data = await graphql<{
    repository: {
      pullRequest: {
        id: string;
        bodyText: string;
        createdAt: string;
        author: { login: string } | null;
        reviews: { nodes: { author: { login: string } | null; state: string; bodyText: string; createdAt: string }[] };
        comments: { nodes: { author: { login: string } | null; bodyText: string; createdAt: string }[] };
        reviewThreads: {
          nodes: {
            id: string;
            isResolved: boolean;
            isOutdated: boolean;
            path: string;
            line: number | null;
            comments: {
              nodes: { author: { login: string } | null; bodyText: string; createdAt: string; url: string }[];
            };
          }[];
        };
        timelineItems: { nodes: TimelineNode[] };
      } | null;
    } | null;
  }>(PR_DETAIL_QUERY, { owner, name, number });

  const empty: PRDetail = { id: "", body: "", reviews: [], comments: [], threads: [], timeline: [] };
  const pr = data.repository?.pullRequest;
  if (!pr) return empty;

  const reviews: ReviewDetail[] = [];
  for (const r of pr.reviews.nodes) {
    // Skip empty "COMMENTED" reviews with no body — they're just containers.
    if (r.state === "COMMENTED" && !r.bodyText) continue;
    reviews.push({
      author: r.author?.login ?? "",
      state: r.state,
      body: truncate(r.bodyText, MAX_BODY),
      createdAt: r.createdAt,
    });
  }

  const comments: Comment[] = pr.comments.nodes.map((c) => ({
    author: c.author?.login ?? "",
    body: truncate(c.bodyText, MAX_BODY),
    createdAt: c.createdAt,
  }));

  const threads: ThreadDetail[] = pr.reviewThreads.nodes.map((t) => ({
    id: t.id,
    // The first comment anchors the thread on GitHub.
    url: t.comments.nodes[0]?.url ?? "",
    path: t.path,
    line: t.line ?? 0,
    resolved: t.isResolved,
    outdated: t.isOutdated,
    comments: t.comments.nodes.map((c) => ({
      author: c.author?.login ?? "",
      body: truncate(c.bodyText, MAX_BODY),
      createdAt: c.createdAt,
    })),
  }));

  // Start with the implicit "opened" event, then map each timeline item.
  const timeline: TimelineEvent[] = [{ kind: "opened", actor: pr.author?.login ?? "", at: pr.createdAt }];
  for (const node of pr.timelineItems.nodes) {
    const event = mapTimelineItem(node);
    if (event) timeline.push(event);
  }

  return { id: pr.id, body: truncate(pr.bodyText ?? "", 4000), reviews, comments, threads, timeline };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Posts a reply on an existing inline review thread. */
export async function replyToThread(threadId: string, body: string): Promise<Comment> {
  const data = await graphql<{
    addPullRequestReviewThreadReply: {
      comment: { author: { login: string } | null; bodyText: string; createdAt: string };
    };
  }>(
    `
      mutation ($threadId: ID!, $body: String!) {
        addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) {
          comment {
            author {
              login
            }
            bodyText
            createdAt
          }
        }
      }
    `,
    { threadId, body },
  );
  const c = data.addPullRequestReviewThreadReply.comment;
  return { author: c.author?.login ?? "", body: c.bodyText, createdAt: c.createdAt };
}

/** Posts a top-level conversation comment on the PR (subjectId is its node id). */
export async function addComment(subjectId: string, body: string): Promise<Comment> {
  const data = await graphql<{
    addComment: { commentEdge: { node: { author: { login: string } | null; bodyText: string; createdAt: string } } };
  }>(
    `
      mutation ($subjectId: ID!, $body: String!) {
        addComment(input: { subjectId: $subjectId, body: $body }) {
          commentEdge {
            node {
              author {
                login
              }
              bodyText
              createdAt
            }
          }
        }
      }
    `,
    { subjectId, body },
  );
  const c = data.addComment.commentEdge.node;
  return { author: c.author?.login ?? "", body: c.bodyText, createdAt: c.createdAt };
}

/** Resolves or unresolves an inline review thread. */
export async function setThreadResolved(threadId: string, resolved: boolean): Promise<void> {
  const mutation = resolved
    ? `mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id } } }`
    : `mutation($threadId: ID!) { unresolveReviewThread(input: {threadId: $threadId}) { thread { id } } }`;
  await graphql(mutation, { threadId });
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

const ORG_REPOS_QUERY = `
query($org: String!, $first: Int!, $after: String) {
  organization(login: $org) {
    repositories(first: $first, after: $after, orderBy: {field: PUSHED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes { name owner { login } }
    }
  }
}`;

/** Lists an org's repositories, most-recently-pushed first, up to `limit`. */
export async function orgRepos(org: string, limit = 200): Promise<RepoRef[]> {
  if (await isDemoMode()) return demoRepos().filter((r) => r.owner === org);

  const out: RepoRef[] = [];
  let after: string | undefined;

  while (out.length < limit) {
    const pageSize = Math.min(limit - out.length, 100);
    const data = await graphql<{
      organization: {
        repositories: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: { name: string; owner: { login: string } }[];
        };
      } | null;
    }>(ORG_REPOS_QUERY, { org, first: pageSize, ...(after ? { after } : {}) });

    const repos = data.organization?.repositories;
    if (!repos) break;

    for (const node of repos.nodes) {
      out.push({ owner: node.owner.login, name: node.name });
    }
    if (!repos.pageInfo.hasNextPage || !repos.pageInfo.endCursor) break;
    after = repos.pageInfo.endCursor;
  }

  return out;
}

const VIEWER_REPOS_QUERY = `
query($first: Int!, $after: String) {
  viewer {
    repositories(first: $first, after: $after, orderBy: {field: PUSHED_AT, direction: DESC}, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      pageInfo { hasNextPage endCursor }
      nodes { name owner { login } }
    }
  }
}`;

/** Lists repos the viewer can see, most-recently-pushed first. Used when no org scope is active. */
export async function viewerRepos(limit = 200): Promise<RepoRef[]> {
  if (await isDemoMode()) return demoRepos();

  const out: RepoRef[] = [];
  let after: string | undefined;

  while (out.length < limit) {
    const pageSize = Math.min(limit - out.length, 100);
    const data = await graphql<{
      viewer: {
        repositories: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: { name: string; owner: { login: string } }[];
        };
      };
    }>(VIEWER_REPOS_QUERY, { first: pageSize, ...(after ? { after } : {}) });

    const repos = data.viewer.repositories;
    for (const node of repos.nodes) {
      out.push({ owner: node.owner.login, name: node.name });
    }
    if (!repos.pageInfo.hasNextPage || !repos.pageInfo.endCursor) break;
    after = repos.pageInfo.endCursor;
  }

  return out;
}
