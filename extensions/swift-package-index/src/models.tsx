export interface SearchState {
  query: string;
  result: SearchResult;
  isLoading: boolean;
  lastPage: number;
}

export interface SearchResult {
  hasMoreItems: boolean;
  items: PackageInfo[];
}

export interface PackageInfo {
  id: string;
  name?: string;
  description?: string;
  repositoryName: string;
  username: string;
  githubURL: string;
  authorGithubURL: string;
  spiURL: string;
  authorSPIURL: string;
}
