export interface RepoSearchResponse {
  ok: boolean;
  data: Repo[];
}

export interface Repo {
  id: string;
  owner: RepoOwner;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stars_count: number;
  starsCount: string;
  forks_count: number;
  avatar_url: string;
}

export interface RepoOwner {
  id: string;
  username: string;
  avatar_url: string;
  html_url: string;
}
