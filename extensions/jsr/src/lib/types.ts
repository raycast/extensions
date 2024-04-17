export type SearchResultDocument = {
  scope: string;
  name: string;
  description: string;
  runtimeCompat: {
    browser?: boolean;
    deno?: boolean;
    node?: boolean;
    workerd?: boolean;
    bun?: boolean;
  };
  score?: number;
  _omc: number;
  id: string;
};

export type SearchResult = {
  id: number;
  score: number;
  document: SearchResultDocument;
};

export type SearchResults = {
  hits: SearchResult[];
  elapsed: {
    formatted: string;
    raw: number;
  };
  count: number;
};

export type GitHubRepository = {
  id: number;
  owner: string;
  name: string;
  updatedAt: string;
  createdAt: string;
};

export type Package = {
  scope: string;
  name: string;
  description: string;
  githubRepository: GitHubRepository | null;
  runtimeCompat: {
    browser?: boolean;
    deno?: boolean;
    node?: boolean;
    workerd?: boolean;
    bun?: boolean;
  };
  updatedAt: string;
  createdAt: string;
  versionCount: number;
  score: number;
  latestVersion: string;
  whenFeatured: string | null;
};
