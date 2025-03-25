export interface PullRequest {
  id: number;
  title: string;
  description: string;
  repo: {
    name: string;
  };
  commentCount: number;
  author: {
    url: string;
    nickname: string;
  };
  repositoryUrl?: string;
  url?: string;
}

export interface Repository {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  url: string;
  project: {
    key: string;
  };
}
