export type PullRequestShort = {
  id: string;
  number: number;
  user: UserShort;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;

  reviews: ReviewShort[];
  comments: CommentShort[];
  requestedReviewers: ReviewerShort[];

  myIcon: string;
};

export type PullRequestLastVisit = {
  id: string;
  lastVisitedAt: string;
};

export type UserShort = {
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
