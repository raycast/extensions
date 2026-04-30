export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  draft?: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  comments: number;
  pull_request?: {
    merged_at: string | null;
  };
  repository_url: string;
}

export interface CategorizedPRs {
  waitForMerge: PullRequest[];
  waitForChange: PullRequest[];
  waitForReview: PullRequest[];
  parked: PullRequest[];
}

export interface PRDetails {
  mergeable_state: string | null;
  head: { sha: string };
}

export interface SearchResult {
  items: PullRequest[];
  total_count: number;
}

export interface GitHubUser {
  login: string;
}

export interface GitHubErrorResponse {
  message?: string;
  errors?: Array<{ message?: string; code?: string }>;
}
