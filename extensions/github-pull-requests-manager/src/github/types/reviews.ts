import { PullRequest } from "./pr";

export interface ReviewCounts {
  approved: number;
  changesRequested: number;
}

export interface MyReviewActivity {
  hasCommented: boolean;
  hasRequestedChanges: boolean;
  hasReplies: boolean;
}

export interface ReviewRequestsCategorized {
  inReview: Array<{ pr: PullRequest; activity: MyReviewActivity }>;
  pending: PullRequest[];
}

export interface Review {
  user: { login: string };
  state: string;
  submitted_at: string;
}

export interface ReviewComment {
  id: number;
  user: { login: string };
  in_reply_to_id?: number;
}
