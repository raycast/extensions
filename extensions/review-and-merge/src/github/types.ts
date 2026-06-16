import { MergeStateStatus } from "../lib/mergeReadiness";
import { Reviewer, ReviewNode, ReviewRequestNode } from "../lib/reviewers";

export type PullRequestState = "OPEN" | "CLOSED" | "MERGED";
export type ReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED"
  | null;
export type ChecksState =
  | "SUCCESS"
  | "FAILURE"
  | "ERROR"
  | "PENDING"
  | "EXPECTED"
  | null;
export type MergeMethod = "MERGE" | "SQUASH" | "REBASE";

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  state: PullRequestState;
  isDraft: boolean;
  updatedAt: string;
  headRefName: string;
  authorLogin: string;
  authorAvatarUrl: string;
  repo: string;
  defaultMergeMethod: MergeMethod;
  reviewDecision: ReviewDecision;
  mergeStateStatus: MergeStateStatus;
  checksState: ChecksState;
  autoMergeEnabled: boolean;
  autoMergeAllowed: boolean;
  viewerHasApproved: boolean;
  comments: number;
  /** Requested reviewers (pending) plus those who have already reviewed. */
  reviewers: Reviewer[];
}

export interface PullRequestNode {
  id: string;
  number: number;
  title: string;
  url: string;
  state: PullRequestState;
  isDraft: boolean;
  updatedAt: string;
  headRefName: string;
  author: { login: string; avatarUrl: string } | null;
  repository: {
    nameWithOwner: string;
    viewerDefaultMergeMethod: MergeMethod;
    autoMergeAllowed: boolean;
  };
  reviewDecision: ReviewDecision;
  mergeStateStatus: MergeStateStatus;
  autoMergeRequest: { enabledAt: string } | null;
  comments: { totalCount: number };
  commits: {
    nodes: Array<{
      commit: { statusCheckRollup: { state: ChecksState } | null };
    }>;
  };
  latestReviews: { nodes: ReviewNode[] };
  reviewRequests: { nodes: ReviewRequestNode[] };
}
