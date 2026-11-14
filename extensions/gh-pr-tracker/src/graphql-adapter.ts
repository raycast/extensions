import type { PrActivityFieldsFragment } from "./generated/graphql";
import type {
  GHCommit,
  GHIssueComment,
  GHIssueEvent,
  GHLabel,
  GHReview,
  GHReviewComment,
  GHUser,
  PRWithActivity,
} from "./types";
import { apiLog as log } from "./logger";

/**
 * Maps a GraphQL PR node onto the REST-shaped `PRWithActivity` the rest of the extension
 * consumes. Keeping the internal shape means `getAllActivity`, the seen-state model, and every
 * view component are untouched by the transport change.
 *
 * Two invariants this file exists to hold:
 *  1. **itemKey parity.** Numeric ids come from `fullDatabaseId` so `review-123` / `rc-456` /
 *     `ic-789` / `commit-<sha>` match what the REST path produced. Label and force-push events
 *     have no database id and use the shared synthetic-key helpers in utils.ts (§5.1).
 *  2. **Null-safety.** GraphQL `author`/`actor` are nullable `Actor` values (deleted accounts),
 *     so every one is normalized rather than dereferenced (§5.2).
 */

// This is the shared fragment used by both the diagnostic page query and the production
// by-number activity query, so the adapter cannot accidentally depend on page-only fields.
type PRNode = PrActivityFieldsFragment;

const GHOST: GHUser = { login: "ghost", avatar_url: "" };

/**
 * Must match `timelineItems(last: N)` in pr-activity.graphql. Truncation for that connection is
 * detected by saturation (fetched === requested) rather than by `totalCount`, which ignores the
 * `itemTypes` filter — see the note at the timeline loop below.
 */
const TIMELINE_PAGE_SIZE = 30;

// Page sizes for the other connections live in pr-activity.graphql. Measured over 50 open PRs on
// raycast/extensions: at 20, `commits` and `reviewThreads` saturated on 5 of 200 connection reads,
// so both were raised to 50 (cost scales with PR count, not page depth). Their truncation is
// detected via `totalCount`, which is filter-accurate for them, so no mirrored constant is needed.

function toUser(actor: { login?: string | null; avatarUrl?: string | null } | null | undefined): GHUser {
  if (!actor?.login) return GHOST;
  return { login: actor.login, avatar_url: actor.avatarUrl ?? "" };
}

/**
 * `fullDatabaseId` is a BigInt-backed string that may be null. The REST shape uses numbers, and
 * itemKeys interpolate them directly, so parse defensively — a null id would otherwise produce
 * the key `review-null` and collide across items.
 */
function toId(fullDatabaseId: string | null | undefined): number | null {
  if (fullDatabaseId == null) return null;
  const n = Number(fullDatabaseId);
  // Reject anything beyond 2^53: past that, distinct GitHub IDs round to the same Number and
  // two different comments would produce the same itemKey — silently merging their read state.
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * A missing or unsafe ID cannot be converted into the stable REST-compatible seen key. Skipping
 * it would silently hide unread activity, so reject this transport result and let api.ts use REST.
 */
function requireId(fullDatabaseId: string | null | undefined, kind: string): number {
  const id = toId(fullDatabaseId);
  if (id == null) throw new Error(`GitHub GraphQL returned an unusable fullDatabaseId for ${kind}`);
  return id;
}

/** Records which connections came back truncated so callers can decide to fall back. */
export interface TruncationReport {
  /** "owner/repo#number" — PR numbers alone collide across configured repos. */
  prKey: string;
  prNumber: number;
  connection: string;
  fetched: number;
  total: number;
}

export interface AdaptResult {
  pr: PRWithActivity;
  truncations: TruncationReport[];
}

export function adaptPullRequest(node: PRNode, repo: string): AdaptResult {
  const truncations: TruncationReport[] = [];
  // For these connections `totalCount` IS filter-accurate (verified across 50 PRs), so a plain
  // total > fetched comparison is sound. `timelineItems` is the exception and is handled
  // separately below.
  const note = (connection: string, fetched: number, total: number) => {
    if (total > fetched)
      truncations.push({ prKey: `${repo}#${node.number}`, prNumber: node.number, connection, fetched, total });
  };

  const issueComments: GHIssueComment[] = [];
  for (const c of node.comments.nodes ?? []) {
    if (!c) continue;
    const id = requireId(c.fullDatabaseId, "issue comment");
    issueComments.push({
      id,
      user: toUser(c.author),
      body: c.body ?? "",
      created_at: c.createdAt as string,
      updated_at: c.updatedAt as string,
      html_url: c.url as string,
    });
  }
  note("comments", node.comments.nodes?.length ?? 0, node.comments.totalCount);

  const reviews: GHReview[] = [];
  for (const r of node.reviews?.nodes ?? []) {
    if (!r) continue;
    const id = requireId(r.fullDatabaseId, "review");
    reviews.push({
      id,
      user: toUser(r.author),
      state: r.state,
      body: r.body ?? "",
      // A PENDING review has no submittedAt; fall back so date sorting stays total.
      submitted_at: (r.submittedAt as string | null) ?? new Date(0).toISOString(),
      html_url: r.url as string,
    });
  }
  note("reviews", node.reviews?.nodes?.length ?? 0, node.reviews?.totalCount ?? 0);

  const reviewComments: GHReviewComment[] = [];
  for (const thread of node.reviewThreads.nodes ?? []) {
    if (!thread) continue;
    for (const c of thread.comments.nodes ?? []) {
      if (!c) continue;
      const id = requireId(c.fullDatabaseId, "review comment");
      reviewComments.push({
        id,
        pull_request_review_id: toId(c.pullRequestReview?.fullDatabaseId) ?? 0,
        in_reply_to_id: toId(c.replyTo?.fullDatabaseId) ?? undefined,
        user: toUser(c.author),
        body: c.body ?? "",
        path: c.path,
        line: c.line ?? null,
        original_line: c.originalLine ?? null,
        diff_hunk: c.diffHunk,
        created_at: c.createdAt as string,
        updated_at: c.updatedAt as string,
        html_url: c.url as string,
      });
    }
    note("reviewThread.comments", thread.comments.nodes?.length ?? 0, thread.comments.totalCount);
  }
  note("reviewThreads", node.reviewThreads.nodes?.length ?? 0, node.reviewThreads.totalCount);

  const commits: GHCommit[] = [];
  for (const c of node.commits.nodes ?? []) {
    const commit = c?.commit;
    if (!commit) continue;
    commits.push({
      sha: commit.oid as string,
      commit: {
        message: commit.message,
        author: {
          name: commit.author?.name ?? "unknown",
          date: (commit.author?.date as string | null) ?? (commit.committedDate as string),
        },
      },
      author: commit.author?.user ? toUser(commit.author.user) : null,
      html_url: commit.url as string,
    });
  }
  note("commits", node.commits.nodes?.length ?? 0, node.commits.totalCount);

  const assignees: GHUser[] = [];
  for (const a of node.assignees.nodes ?? []) {
    if (!a) continue;
    assignees.push(toUser(a));
  }
  note("assignees", node.assignees.nodes?.length ?? 0, node.assignees.totalCount);

  const requestedReviewers: GHUser[] = [];
  for (const rr of node.reviewRequests?.nodes ?? []) {
    if (!rr?.requestedReviewer) continue;
    if (rr.requestedReviewer.__typename !== "User") continue; // Team-requested reviews are out of scope
    requestedReviewers.push({ login: rr.requestedReviewer.login, avatar_url: rr.requestedReviewer.avatarUrl ?? "" });
  }
  note("reviewRequests", node.reviewRequests?.nodes?.length ?? 0, node.reviewRequests?.totalCount ?? 0);

  const labels: GHLabel[] = [];
  for (const l of node.labels?.nodes ?? []) {
    if (!l) continue;
    // GraphQL labels have no numeric database id in this fragment — `0` is the same placeholder
    // already used for labels synthesized from timeline events below.
    labels.push({ id: 0, name: l.name, color: l.color });
  }
  note("labels", node.labels?.nodes?.length ?? 0, node.labels?.totalCount ?? 0);

  // Timeline events carry no database id — getAllActivity derives synthetic keys from
  // (actor, createdAt, label), so `id` here is only a local uniqueness token.
  const events: GHIssueEvent[] = [];
  let syntheticId = 0;
  for (const item of node.timelineItems.nodes ?? []) {
    if (!item) continue;
    const shared = { id: --syntheticId, created_at: "", actor: GHOST };
    if (item.__typename === "LabeledEvent") {
      events.push({
        ...shared,
        event: "labeled",
        created_at: item.createdAt as string,
        actor: toUser(item.actor),
        label: { id: 0, name: item.label.name, color: item.label.color },
      });
    } else if (item.__typename === "UnlabeledEvent") {
      events.push({
        ...shared,
        event: "unlabeled",
        created_at: item.createdAt as string,
        actor: toUser(item.actor),
        label: { id: 0, name: item.label.name, color: item.label.color },
      });
    } else if (item.__typename === "HeadRefForcePushedEvent") {
      events.push({
        ...shared,
        event: "head_ref_force_pushed",
        created_at: item.createdAt as string,
        actor: toUser(item.actor),
      });
    }
  }
  // NOT `note(...)`: `timelineItems.totalCount` IGNORES the `itemTypes` filter and counts the
  // entire timeline (commits, reviews, assignments, …), while `nodes` returns only our three
  // event types. Measured on raycast/extensions#29797: totalCount 9, matching nodes 4 — the
  // filtered and unfiltered counts are identical. Comparing them flagged every PR as truncated
  // and triggered a pointless REST backfill for all of them.
  //
  // Truncation here is instead detected by saturation: if we asked for N and got exactly N back,
  // there may be more we did not see. Anything less than N means we have them all.
  const timelineFetched = node.timelineItems.nodes?.length ?? 0;
  if (timelineFetched >= TIMELINE_PAGE_SIZE) {
    truncations.push({
      prKey: `${repo}#${node.number}`,
      prNumber: node.number,
      connection: "timelineItems",
      fetched: timelineFetched,
      total: node.timelineItems.totalCount,
    });
  }

  if (truncations.length > 0) {
    log.debug("Truncated connections on PR", { pr: node.number, truncations });
  }

  return {
    pr: {
      number: node.number,
      title: node.title,
      html_url: node.url as string,
      created_at: node.createdAt as string,
      updated_at: node.updatedAt as string,
      user: toUser(node.author),
      comments: node.comments.totalCount,
      state: node.state.toLowerCase(),
      assignees,
      requested_reviewers: requestedReviewers,
      labels,
      draft: node.isDraft,
      repo,
      reviews,
      reviewComments,
      issueComments,
      events,
      commits,
    },
    truncations,
  };
}
