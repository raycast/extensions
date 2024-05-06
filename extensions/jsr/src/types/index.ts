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
  updatedAt: string | null;
  createdAt: string | null;
  versionCount: number | null;
  score: number | null;
  latestVersion: string | null;
  whenFeatured: string | null;
};
