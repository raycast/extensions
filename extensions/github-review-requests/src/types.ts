export type PullRequestShort = {
  id: string;
  number: number;
  user: UserShort;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  repo: string;
  owner: RepoOwnerShort;
  reviewDecision?: ReviewDecision | null;
  reviews: ReviewShort[];
  comments: CommentShort[];
  requestedReviewers: ReviewerShort[];
  /**
   * Set when the pull request reached the menu only through the scope sweep —
   * it is neither yours nor awaiting your review, it simply lives in a
   * repository or owner you put in scope.
   */
  inWatchedScope?: boolean;
};

/**
 * A pull request as the menus hold it: same fields, with the owner flattened
 * to its login. This is also what lands in the recent-history store, so it is
 * the honest type there rather than PullRequestShort.
 */
export type MenuPullRequest = Omit<PullRequestShort, "owner"> & { owner: string };

export type PullRequestLastVisit = {
  id: string;
  lastVisitedAt: string;
};

export type UserShort = {
  login: string;
  avatarUrl: string;
};

export type RepoOwnerShort = {
  login: string;
  avatarUrl: string;
};

export type ReviewShort = {
  id: string;
  user: UserShort;
  url: string;
  state: string;
  submittedAt: string;
};

export type CommentShort = {
  user: UserShort;
  url: string;
  createdAt: string;
};

export type ReviewerShort = {
  id: string;
  login?: string;
  name?: string;
};

export enum ReviewDecision {
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  REVIEW_REQUIRED = "REVIEW_REQUIRED",
}
