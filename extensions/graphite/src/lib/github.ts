import { z } from "zod";
import { CommandError, runGh } from "./cli";
import { refKey, type PullRequestRef } from "./refs";

/**
 * GitHub data comes from the GitHub CLI (`gh api graphql`), using whatever account `gh auth login` set up.
 * Graphite's inbox tells us *which* PRs matter; GitHub tells us reviews, threads, checks and descriptions.
 */

// Defined in a leaf module so other modules can use it without importing the GitHub client.
export { refKey, type PullRequestRef } from "./refs";

export type GitHubUnavailableReason = "NOT_INSTALLED" | "NOT_AUTHENTICATED" | "FAILED";

export class GitHubUnavailableError extends Error {
  constructor(
    readonly reason: GitHubUnavailableReason,
    message: string,
  ) {
    super(message);
    this.name = "GitHubUnavailableError";
  }
}

/** Keeps usable GraphQL data even when GitHub also reports errors for other fields. */
export function parseGraphQLOutput(stdout: string): { data: unknown; errors: string[] } | undefined {
  try {
    const response = z
      .object({ data: z.unknown(), errors: z.array(z.object({ message: z.string() }).loose()).optional() })
      .loose()
      .safeParse(JSON.parse(stdout));
    if (!response.success || response.data.data === null || response.data.data === undefined) return undefined;
    return { data: response.data.data, errors: response.data.errors?.map((error) => error.message) ?? [] };
  } catch {
    return undefined;
  }
}

/** Classifies CLI failures using diagnostics rather than pull request content on stdout. */
export function classifyGitHubError(error: unknown): Error {
  if (error instanceof CommandError) {
    if (error.notFound) return new GitHubUnavailableError("NOT_INSTALLED", error.message);
    if (/rate limit/i.test(error.stderr)) {
      return new GitHubUnavailableError("FAILED", "GitHub's API rate limit was reached. Try again in a few minutes.");
    }
    if (/SAML|SSO/i.test(error.stderr)) {
      return new GitHubUnavailableError(
        "FAILED",
        "An organization requires single sign-on for the GitHub CLI. Run `gh auth refresh` and authorize the organization.",
      );
    }
    if (/gh auth login|not logged in|authentication|HTTP 401/i.test(`${error.stderr}\n${error.message}`)) {
      return new GitHubUnavailableError("NOT_AUTHENTICATED", "The GitHub CLI is not signed in. Run `gh auth login`.");
    }
    return new GitHubUnavailableError("FAILED", error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function graphql(query: string): Promise<unknown> {
  try {
    const { stdout } = await runGh(["api", "graphql", "-f", `query=${query}`]);
    const result = parseGraphQLOutput(stdout);
    return result ? { data: result.data } : JSON.parse(stdout);
  } catch (error) {
    if (error instanceof CommandError && !error.notFound) {
      const result = parseGraphQLOutput(error.stdout);
      if (result) return { data: result.data };
    }
    throw classifyGitHubError(error);
  }
}

/** GraphQL string literal. JSON string escaping is valid GraphQL string escaping. */
const literal = (value: string) => JSON.stringify(value);

// Status: the light-weight facts shown in lists ------------------------------------------------------------------

const reviewSchema = z.object({
  state: z.string(),
  body: z.string(),
  author: z.object({ login: z.string(), avatarUrl: z.string().optional() }).nullable(),
  comments: z.object({ totalCount: z.number() }).optional(),
  submittedAt: z.string().nullable().optional(),
});

const statusFields = `
  number isDraft reviewDecision mergeable mergeStateStatus viewerDidAuthor
  viewerLatestReview { state }
  reviewThreads(first: 100) { totalCount nodes { isResolved } }
  latestOpinionatedReviews(first: 30) { nodes { state body author { login avatarUrl } comments { totalCount } submittedAt } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
`;

const statusSchema = z.object({
  number: z.number(),
  isDraft: z.boolean(),
  reviewDecision: z.string().nullable(),
  mergeable: z.string(),
  mergeStateStatus: z.string(),
  viewerDidAuthor: z.boolean(),
  viewerLatestReview: z.object({ state: z.string() }).nullable(),
  reviewThreads: z.object({
    totalCount: z.number().optional(),
    nodes: z.array(z.object({ isResolved: z.boolean() })),
  }),
  latestOpinionatedReviews: z.object({ nodes: z.array(reviewSchema) }),
  commits: z.object({
    nodes: z.array(z.object({ commit: z.object({ statusCheckRollup: z.object({ state: z.string() }).nullable() }) })),
  }),
});

export type Review = z.infer<typeof reviewSchema>;

export type PullRequestStatus = {
  isDraft: boolean;
  reviewDecision: string | null;
  /** SUCCESS, FAILURE, ERROR, PENDING, EXPECTED, or null when the PR has no checks. */
  checks: string | null;
  unresolvedThreads: number;
  /** True when the PR has more review threads than were fetched, so `unresolvedThreads` is a lower bound. */
  threadsTruncated?: boolean;
  /** Approving reviews that also left a written comment or inline comments. */
  approvalsWithComments: Review[];
  viewerReview: string | null;
  viewerDidAuthor: boolean;
  hasConflicts: boolean;
};

function hasWrittenFeedback(review: Review): boolean {
  return review.body.trim().length > 0 || (review.comments?.totalCount ?? 0) > 0;
}

function toStatus(raw: z.infer<typeof statusSchema>): PullRequestStatus {
  return {
    isDraft: raw.isDraft,
    reviewDecision: raw.reviewDecision,
    checks: raw.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
    unresolvedThreads: raw.reviewThreads.nodes.filter((thread) => !thread.isResolved).length,
    threadsTruncated: (raw.reviewThreads.totalCount ?? 0) > raw.reviewThreads.nodes.length,
    approvalsWithComments: raw.latestOpinionatedReviews.nodes.filter(
      (review) => review.state === "APPROVED" && hasWrittenFeedback(review),
    ),
    viewerReview: raw.viewerLatestReview?.state ?? null,
    viewerDidAuthor: raw.viewerDidAuthor,
    hasConflicts: raw.mergeable === "CONFLICTING",
  };
}

const BATCH_SIZE = 25;

/** Fetches statuses for many PRs with a handful of batched GraphQL queries. */
export async function fetchStatuses(refs: PullRequestRef[]): Promise<Record<string, PullRequestStatus>> {
  const unique = [...new Map(refs.map((ref) => [refKey(ref), ref])).values()];
  const batches: PullRequestRef[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) batches.push(unique.slice(i, i + BATCH_SIZE));

  const results = await Promise.allSettled(
    batches.map(async (batch) => {
      const query = `query { ${batch
        .map(
          (ref, i) =>
            `p${i}: repository(owner: ${literal(ref.owner)}, name: ${literal(ref.repo)}) { pullRequest(number: ${ref.number}) { ${statusFields} } }`,
        )
        .join("\n")} }`;
      const response = z
        .object({ data: z.record(z.string(), z.object({ pullRequest: statusSchema.nullable() }).nullable()) })
        .parse(await graphql(query));
      return batch.map((ref, i): [string, PullRequestStatus | undefined] => {
        const pullRequest = response.data[`p${i}`]?.pullRequest;
        return [refKey(ref), pullRequest ? toStatus(pullRequest) : undefined];
      });
    }),
  );

  const firstRejection = results.find((result) => result.status === "rejected");
  if (firstRejection && results.every((result) => result.status === "rejected")) throw firstRejection.reason;

  const statuses: Record<string, PullRequestStatus> = {};
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const [key, status] of result.value) {
      if (status) statuses[key] = status;
    }
  }
  return statuses;
}

// Details: everything shown on the full pull request page --------------------------------------------------------

const actorSchema = z.object({
  login: z.string(),
  avatarUrl: z.string().optional(),
  name: z.string().nullable().optional(),
});

const detailsSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string(),
  url: z.string(),
  state: z.string(),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
  baseRefName: z.string(),
  headRefName: z.string(),
  author: actorSchema.nullable(),
  labels: z.object({ nodes: z.array(z.object({ name: z.string(), color: z.string() })) }),
  reviewRequests: z.object({
    nodes: z.array(
      z.object({
        requestedReviewer: z
          .object({ login: z.string().optional(), name: z.string().optional(), slug: z.string().optional() })
          .nullable(),
      }),
    ),
  }),
  reviewThreads: z.object({
    totalCount: z.number().optional(),
    nodes: z.array(
      z.object({
        isResolved: z.boolean(),
        isOutdated: z.boolean(),
        path: z.string(),
        line: z.number().nullable(),
        comments: z.object({
          totalCount: z.number(),
          nodes: z.array(z.object({ author: actorSchema.nullable(), body: z.string(), url: z.string() })),
        }),
      }),
    ),
  }),
  comments: z.object({ totalCount: z.number() }),
  commits: z.object({
    nodes: z.array(
      z.object({
        commit: z.object({
          statusCheckRollup: z
            .object({
              state: z.string(),
              contexts: z.object({
                nodes: z.array(
                  z.object({
                    __typename: z.string(),
                    name: z.string().optional(),
                    conclusion: z.string().nullable().optional(),
                    status: z.string().optional(),
                    context: z.string().optional(),
                    state: z.string().optional(),
                  }),
                ),
              }),
            })
            .nullable(),
        }),
      }),
    ),
  }),
});

export type ReviewThread = {
  path: string;
  line: number | null;
  isOutdated: boolean;
  replies: number;
  author: string;
  body: string;
  url: string;
};

export type Check = { name: string; state: "SUCCESS" | "FAILURE" | "PENDING" | "NEUTRAL" };

export type PullRequestDetails = PullRequestStatus & {
  title: string;
  body: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  baseRefName: string;
  headRefName: string;
  author: z.infer<typeof actorSchema> | null;
  labels: { name: string; color: string }[];
  requestedReviewers: string[];
  reviews: Review[];
  unresolved: ReviewThread[];
  conversationComments: number;
  checkRuns: Check[];
};

function checkState(conclusionOrState: string | null | undefined, status?: string): Check["state"] {
  if (status && status !== "COMPLETED") return "PENDING";
  switch (conclusionOrState) {
    case "SUCCESS":
      return "SUCCESS";
    case "FAILURE":
    case "ERROR":
    case "TIMED_OUT":
    case "CANCELLED":
    case "STARTUP_FAILURE":
    case "ACTION_REQUIRED":
      return "FAILURE";
    case "PENDING":
    case "EXPECTED":
    case null:
    case undefined:
      return "PENDING";
    default:
      return "NEUTRAL";
  }
}

const CHECK_SEVERITY: Record<Check["state"], number> = { FAILURE: 3, PENDING: 2, SUCCESS: 1, NEUTRAL: 0 };

/** Re-run workflows report the same check several times; keep the most severe result per name. */
function dedupeChecks(checks: Check[]): Check[] {
  const byName = new Map<string, Check>();
  for (const check of checks) {
    const existing = byName.get(check.name);
    if (!existing || CHECK_SEVERITY[check.state] > CHECK_SEVERITY[existing.state]) byName.set(check.name, check);
  }
  return [...byName.values()];
}

export async function fetchDetails(ref: PullRequestRef): Promise<PullRequestDetails> {
  const query = `query {
    repository(owner: ${literal(ref.owner)}, name: ${literal(ref.repo)}) {
      pullRequest(number: ${ref.number}) {
        ${statusFields}
        title body url state createdAt updatedAt additions deletions changedFiles baseRefName headRefName
        author { login avatarUrl ... on User { name } }
        labels(first: 20) { nodes { name color } }
        reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } ... on Team { name slug } } } }
        reviewThreads(first: 100) {
          nodes {
            isResolved isOutdated path line
            comments(first: 1) { totalCount nodes { author { login avatarUrl } body url } }
          }
        }
        comments { totalCount }
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state contexts(first: 100) { nodes {
            __typename
            ... on CheckRun { name conclusion status }
            ... on StatusContext { context state }
          } } } } }
        }
      }
    }
  }`;

  const response = z
    .object({
      data: z.object({
        repository: z.object({ pullRequest: statusSchema.extend(detailsSchema.shape).nullable() }).nullable(),
      }),
    })
    .parse(await graphql(query));
  const pr = response.data.repository?.pullRequest;
  if (!pr) throw new Error(`Pull request ${refKey(ref)} was not found on GitHub.`);

  const contexts = pr.commits.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? [];
  return {
    ...toStatus(pr),
    title: pr.title,
    body: pr.body,
    url: pr.url,
    state: pr.state,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    author: pr.author,
    labels: pr.labels.nodes,
    requestedReviewers: pr.reviewRequests.nodes
      .map((request) => request.requestedReviewer?.login ?? request.requestedReviewer?.name)
      .filter((name): name is string => Boolean(name)),
    reviews: pr.latestOpinionatedReviews.nodes,
    unresolved: pr.reviewThreads.nodes
      .filter((thread) => !thread.isResolved)
      .map((thread) => ({
        path: thread.path,
        line: thread.line,
        isOutdated: thread.isOutdated,
        replies: Math.max(0, thread.comments.totalCount - 1),
        author: thread.comments.nodes[0]?.author?.login ?? "unknown",
        body: thread.comments.nodes[0]?.body ?? "",
        url: thread.comments.nodes[0]?.url ?? pr.url,
      })),
    conversationComments: pr.comments.totalCount,
    checkRuns: dedupeChecks(
      contexts.map((context) =>
        context.__typename === "CheckRun"
          ? { name: context.name ?? "Check", state: checkState(context.conclusion, context.status) }
          : { name: context.context ?? "Status", state: checkState(context.state) },
      ),
    ),
  };
}

// Reviews --------------------------------------------------------------------------------------------------------

export type ReviewKind = "approve" | "request-changes" | "comment";

const REVIEW_FLAGS: Record<ReviewKind, string> = {
  approve: "--approve",
  "request-changes": "--request-changes",
  comment: "--comment",
};

export async function submitReview(ref: PullRequestRef, kind: ReviewKind, body?: string): Promise<void> {
  const args = ["pr", "review", String(ref.number), "--repo", `${ref.owner}/${ref.repo}`, REVIEW_FLAGS[kind]];
  if (body?.trim()) args.push("--body", body.trim());
  try {
    await runGh(args);
  } catch (error) {
    throw classifyGitHubError(error);
  }
}

// Merging --------------------------------------------------------------------------------------------------------

const GRAPHITE_TEMPORARY_BASE = "graphite-base/";
const COMMON_TRUNK_NAMES = [
  "main",
  "master",
  "develop",
  "development",
  "dev",
  "trunk",
  "staging",
  "production",
  "release",
];

export type StackPullRequest = { number: number; title: string; baseRefName: string };
export type DownstackSource = {
  /** Default branch and the starting PR. */
  start(ref: PullRequestRef): Promise<{ defaultBranch: string; pullRequest: StackPullRequest | undefined }>;
  /** Open, same-repository PRs whose head branch is `branch` (forks excluded). */
  openPullRequestsWithHead(ref: PullRequestRef, branch: string): Promise<StackPullRequest[]>;
};
/** Pull requests in merge order, bottom to top, including the selected PR. */
export type Downstack = { trunk: string; pullRequests: StackPullRequest[] };

export class StackWalkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StackWalkError";
  }
}

/** Follows base branches, stopping at trunks and rejecting ambiguous or incomplete stacks. */
export async function walkDownstack(
  ref: PullRequestRef,
  source: DownstackSource,
  knownTrunks: string[] = [],
): Promise<Downstack> {
  const { defaultBranch, pullRequest } = await source.start(ref);
  if (!pullRequest) throw new StackWalkError(`Couldn't find #${ref.number} on GitHub.`);
  // Prefer a false stop on a common trunk name to accidentally merging a release PR.
  const trunks = new Set([defaultBranch, ...knownTrunks, ...COMMON_TRUNK_NAMES]);
  const pullRequests = [pullRequest];
  const seen = new Set([pullRequest.number]);
  let base = pullRequest.baseRefName;
  while (true) {
    if (base.startsWith(GRAPHITE_TEMPORARY_BASE)) return { trunk: defaultBranch, pullRequests };
    if (trunks.has(base) || base.startsWith("release/")) return { trunk: base, pullRequests };
    const candidates = await source.openPullRequestsWithHead(ref, base);
    if (candidates.length === 0) return { trunk: base, pullRequests };
    if (candidates.length > 1) {
      throw new StackWalkError(
        `More than one open pull request uses the branch ${base}. Merge this stack in Graphite instead.`,
      );
    }
    const parent = candidates[0];
    if (seen.has(parent.number)) {
      throw new StackWalkError("The stack loops back on itself. Merge it in Graphite instead.");
    }
    if (pullRequests.length >= 25) {
      throw new StackWalkError("This stack is deeper than 25 pull requests. Merge it in Graphite instead.");
    }
    seen.add(parent.number);
    pullRequests.unshift(parent);
    base = parent.baseRefName;
  }
}

const stackPullRequestSchema = z.object({ number: z.number(), title: z.string(), baseRefName: z.string() });

const gitHubDownstackSource: DownstackSource = {
  async start(ref) {
    const repo = `repository(owner: ${literal(ref.owner)}, name: ${literal(ref.repo)})`;
    const { data } = z
      .object({
        data: z.object({
          repository: z.object({
            defaultBranchRef: z.object({ name: z.string() }).nullable(),
            pullRequest: stackPullRequestSchema.nullable(),
          }),
        }),
      })
      .parse(
        await graphql(
          `query { ${repo} { defaultBranchRef { name } pullRequest(number: ${ref.number}) { number title baseRefName } } }`,
        ),
      );
    return {
      defaultBranch: data.repository.defaultBranchRef?.name ?? "main",
      pullRequest: data.repository.pullRequest ?? undefined,
    };
  },
  async openPullRequestsWithHead(ref, branch) {
    const repo = `repository(owner: ${literal(ref.owner)}, name: ${literal(ref.repo)})`;
    const { data } = z
      .object({
        data: z.object({
          repository: z.object({
            pullRequests: z.object({
              nodes: z.array(stackPullRequestSchema.extend({ isCrossRepository: z.boolean() })),
            }),
          }),
        }),
      })
      .parse(
        await graphql(
          `query { ${repo} { pullRequests(headRefName: ${literal(branch)}, states: OPEN, first: 5) { nodes { number title baseRefName isCrossRepository } } } }`,
        ),
      );
    return data.repository.pullRequests.nodes
      .filter((pr) => pr.isCrossRepository === false)
      .map(({ number, title, baseRefName }) => ({ number, title, baseRefName }));
  },
};

/** Looks up a stack on GitHub, using local Graphite trunks when available. */
export async function findDownstack(ref: PullRequestRef, knownTrunks?: string[]): Promise<Downstack> {
  return walkDownstack(ref, gitHubDownstackSource, knownTrunks);
}
