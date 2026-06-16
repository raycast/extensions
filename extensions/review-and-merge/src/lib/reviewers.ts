/** A reviewer's state on a pull request. */
export type ReviewerStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "commented";

export interface Reviewer {
  type: "user" | "team";
  /** A user's login, or a team's name. */
  login: string;
  /** Avatar URL for users; empty string for teams (they have no avatar here). */
  avatarUrl: string;
  status: ReviewerStatus;
}

/** A `reviewRequests` node: the reviewer GitHub still expects a review from. */
export interface ReviewRequestNode {
  requestedReviewer: {
    __typename: string;
    login?: string;
    avatarUrl?: string;
    name?: string;
  } | null;
}

/** A `latestReviews` node: a review already submitted by an author. */
export interface ReviewNode {
  author: { login: string; avatarUrl: string } | null;
  state: string;
}

const REVIEW_STATE_TO_STATUS: Record<string, ReviewerStatus> = {
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
  COMMENTED: "commented",
};

/**
 * Merge the people still requested for review (pending) with the ones who have
 * already reviewed (approved / changes requested / commented) into a single
 * list. A reviewer who has been re-requested counts as pending again, so their
 * stale past review is ignored. Reviews in other states (PENDING, DISMISSED)
 * are dropped.
 */
export function buildReviewers(
  reviewRequests: ReviewRequestNode[],
  latestReviews: ReviewNode[],
): Reviewer[] {
  const reviewers: Reviewer[] = [];
  const requestedLogins = new Set<string>();

  for (const { requestedReviewer } of reviewRequests) {
    if (!requestedReviewer) continue;
    if (requestedReviewer.__typename === "Team") {
      reviewers.push({
        type: "team",
        login: requestedReviewer.name ?? "Team",
        avatarUrl: "",
        status: "pending",
      });
    } else if (requestedReviewer.login) {
      requestedLogins.add(requestedReviewer.login);
      reviewers.push({
        type: "user",
        login: requestedReviewer.login,
        avatarUrl: requestedReviewer.avatarUrl ?? "",
        status: "pending",
      });
    }
  }

  for (const { author, state } of latestReviews) {
    if (!author) continue;
    if (requestedLogins.has(author.login)) continue; // re-requested → still pending
    const status = REVIEW_STATE_TO_STATUS[state];
    if (!status) continue;
    reviewers.push({
      type: "user",
      login: author.login,
      avatarUrl: author.avatarUrl ?? "",
      status,
    });
  }

  return reviewers;
}
