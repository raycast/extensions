export type Remote = "github" | "gitlab";

export type PullRequestState = "open" | "closed" | "merged";

export type CodeReviewStatus =
  | "PENDING"
  | "REVIEWING_FILES"
  | "GENERATING_SUMMARY"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type RepositoryFilter = {
  name?: string;
  remote?: Remote;
  defaultBranch?: string;
  remoteUrl?: string;
};

export type PaginationInput = {
  limit?: number;
  offset?: number;
};

export type GreptileRepository = {
  id?: string;
  name?: string;
  remote?: Remote;
  remoteUrl?: string;
  url?: string;
};

export type MergeRequest = {
  id: string;
  number: number;
  title: string;
  state?: PullRequestState | string;
  isDraft?: boolean;
  authorLogin?: string;
  branches?: {
    source?: string;
    target?: string;
  };
  stats?: {
    changedFiles?: number;
    additions?: number;
    deletions?: number;
  };
  commentsCount?: number;
  reviewsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  repository?: GreptileRepository;
  sourceRepoUrl?: string;
};

export type CodeReview = {
  id: string;
  body?: string;
  status: CodeReviewStatus | string;
  createdAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  mergeRequest?: {
    id?: string;
    prNumber?: number;
    number?: number;
    title?: string;
    sourceRepoUrl?: string;
    description?: string;
    authorLogin?: string;
    repository?: GreptileRepository;
  };
};

export type GreptileComment = {
  id: string;
  commentId?: string;
  body: string;
  authorLogin?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  addressed?: boolean;
  greptileGenerated?: boolean;
  createdAt?: string;
  mergeRequest?: {
    id?: string;
    prNumber?: number;
    title?: string;
    sourceRepoUrl?: string;
    repository?: GreptileRepository;
  };
  linkedMemory?: {
    id?: string;
    type?: string;
    body?: string;
  };
};

export type ListPullRequestsResponse = {
  mergeRequests: MergeRequest[];
  total: number;
};

export type ListCodeReviewsResponse = {
  codeReviews: CodeReview[];
  total: number;
};

export type GetCodeReviewResponse = {
  codeReview: CodeReview;
};

export type SearchCommentsResponse = {
  comments: GreptileComment[];
  query: string;
  total: number;
};
