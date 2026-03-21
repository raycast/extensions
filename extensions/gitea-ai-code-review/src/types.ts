export interface GiteaPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  html_url: string;
  diff_url: string;
  patch_url: string;
}

export interface GiteaFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  contents_url?: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  comment: string;
  severity: "info" | "warning" | "critical";
}

export interface AIReviewResult {
  summary: string;
  comments: ReviewComment[];
  score: number;
}
