import { MergeStateStatus } from "../lib/mergeReadiness";

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
  viewerHasApproved: boolean;
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
  repository: { nameWithOwner: string; viewerDefaultMergeMethod: MergeMethod };
  reviewDecision: ReviewDecision;
  mergeStateStatus: MergeStateStatus;
  autoMergeRequest: { enabledAt: string } | null;
  commits: {
    nodes: Array<{
      commit: { statusCheckRollup: { state: ChecksState } | null };
    }>;
  };
  latestReviews: {
    nodes: Array<{ author: { login: string } | null; state: string }>;
  };
}
