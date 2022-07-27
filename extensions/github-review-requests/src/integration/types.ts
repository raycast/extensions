import { components } from "@octokit/openapi-types";

export type PullSearchResult = components["schemas"]["issue-search-result-item"];
export type NullableSimpleUser = components["schemas"]["nullable-simple-user"];
export type PullRequestReviewComment = components["schemas"]["pull-request-review-comment"];
export type IssueComment = components["schemas"]["issue-comment"];
export type PullRequestReview = components["schemas"]["pull-request-review"];

export type PullSearchResultShort = {
  id: number;
  url: string;
  repository_url: string;
  html_url: string;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: UserShort | null;

  myIcon: string;
}

export type PullRequestReviewShort = {
  id: number;
  state: string;
  html_url: string;
  submitted_at?: string;
  user: UserShort | null;
};

export type UserShort = {
  login: string;
  avatar_url: string;
  url: string;
};

export type TeamShort = {
  id: number;
  name: string;
  html_url: string;
};

export type CommentShort = {
  created_at: string;
  html_url: string;
  user: UserShort | null;
};

export type PullRequestLastVisit = {
  pull: PullSearchResultShort;
  last_visit: string;
}

export type PullRequestID = {
  owner: string;
  repo: string;
  pull_number: number;
};

export type UndefinedString = string | undefined;

export type PullWithDependencies = {
  pull: PullSearchResultShort;

  comments: CommentShort[];
  reviews: PullRequestReviewShort[];
  requestedReviewers: {
    users?: UserShort[];
    teams?: TeamShort[];
  }
};
