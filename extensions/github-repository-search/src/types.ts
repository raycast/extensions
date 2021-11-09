export interface Repository {
  id: string;
  nameWithOwner: string;
  owner: {
    avatarUrl?: string;
  };
  viewerHasStarred: boolean;
  stargazerCount: number;
  primaryLanguage?: {
    name: string;
  };
  updatedAt: string;
  url: string;
  hasIssuesEnabled: boolean;
  hasWikiEnabled: boolean;
  hasProjectsEnabled: boolean;
}

export interface SearchRepositoriesResponse {
  search: {
    repositoryCount: number;
    nodes: Repository[];
  };
}
