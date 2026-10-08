// ─── GitHub API response shapes ─────────────────────────────────────────────

export interface GHUser {
  login: string;
  avatar_url: string;
}

export interface GHLabel {
  id: number;
  name: string;
  color: string;
}

export interface GHPullRequest {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: GHUser;
  comments: number;
  state: string;
  /** Up to 10 — GitHub caps assignees per PR at 10. */
  assignees: GHUser[];
  /** Users with a pending review request. Team-requested reviews are not represented here. */
  requested_reviewers: GHUser[];
  labels: GHLabel[];
  draft: boolean;
}

export interface GHReview {
  id: number;
  user: GHUser;
  state: string; // APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING
  body: string;
  submitted_at: string;
  html_url: string;
}

export interface GHReviewComment {
  id: number;
  pull_request_review_id: number;
  in_reply_to_id?: number;
  user: GHUser;
  body: string;
  path: string;
  line: number | null;
  original_line: number | null;
  diff_hunk: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GHIssueComment {
  id: number;
  user: GHUser;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GHIssueEvent {
  id: number;
  event: string; // "labeled", "unlabeled", etc.
  created_at: string;
  actor: GHUser;
  label?: GHLabel;
}

export interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: GHUser | null;
  html_url: string;
}

// ─── Internal types ─────────────────────────────────────────────────────────

export interface PRWithActivity extends GHPullRequest {
  repo: string; // "owner/repo" identifier
  reviews: GHReview[];
  reviewComments: GHReviewComment[];
  issueComments: GHIssueComment[];
  events: GHIssueEvent[];
  commits: GHCommit[];
}

/** Unique key for a PR across repositories */
export function prKey(pr: { repo: string; number: number }): string {
  return `${pr.repo}#${pr.number}`;
}

export interface SeenState {
  /** Last user action that marked any activity on this PR as seen. Kept for compatibility only. */
  lastSeen: string; // ISO timestamp
  seenItemIds: string[]; // individual item IDs like "review-123", "rc-456"
  /**
   * A conservative activity watermark. It exists only after a user marks the entire PR as seen,
   * so activity at or before this time may be skipped by the GraphQL metadata pre-filter.
   *
   * Old entries deliberately lack this field: `lastSeen` was also advanced by the single-item
   * action, and treating it as a complete watermark would hide other still-unread items.
   */
  fullySeenAt?: string;
  /**
   * Which clock `fullySeenAt` came from, because the prefilter must treat them differently.
   *
   *  - `"updated-at"` — the PR's own `updated_at`, recorded by a fetch that found nothing unseen.
   *    Same clock as the value it is compared against, so no safety margin applies.
   *  - `"wall-clock"` — `Date.now()` at a mark-as-read action. GitHub's `updated_at` can lag real
   *    activity by 6–10s, so the prefilter widens the window for these.
   *
   * Absent on entries written before this field existed; treated as `"wall-clock"` (the
   * conservative reading, since that is the one that keeps the safety margin).
   */
  watermarkSource?: "updated-at" | "wall-clock";
}

/** Keyed by "owner/repo#number" to avoid collisions across repos */
export type SeenMap = Record<string, SeenState>;

/** A single unseen activity item for display */
export interface ActivityItem {
  type:
    | "review"
    | "review_comment"
    | "issue_comment"
    | "label_added"
    | "label_removed"
    | "push"
    | "pr_opened"
    | "force_push";
  id: number | string;
  /** Stable unique key for seen-tracking: "review-123", "rc-456", "ic-789", "label-123", "commit-abc", "pr-opened-42" */
  itemKey: string;
  user: GHUser;
  body: string;
  date: string; // ISO
  htmlUrl: string;
  // review-specific
  reviewState?: string;
  // review-comment-specific
  path?: string;
  line?: number | null;
  diffHunk?: string;
  inReplyToId?: number;
  // label-specific
  labelName?: string;
  labelColor?: string;
  // commit-specific
  commitSha?: string;
}
