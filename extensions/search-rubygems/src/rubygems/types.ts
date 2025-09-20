export interface Metadata {
  [key: string]: string;
}

type ResultAttributes = { [key: string]: boolean | string | string[] | number | Metadata | Dependencies };

export type GemSearchResult = ResultAttributes & {
  authors: string;
  bug_tracker_uri: string;
  changelog_uri: string;
  documentation_uri: string;
  downloads: number;
  funding_uri: boolean | string;
  gem_uri: string;
  homepage_uri: string;
  info: string;
  licenses: string[];
  mailing_list_uri: string;
  metadata: Metadata;
  name: string;
  platform: string;
  project_uri: string;
  sha: string;
  source_code_uri: string;
  version: string;
  version_downloads: number;
  wiki_uri: string;
};
export type GemsSearchResponse = GemSearchResult[];

export type Dependency = {
  name: string;
  requirements: string;
};

export type Dependencies = {
  development?: Dependency[];
  runtime?: Dependency[];
};

export type GemDetailResponse = GemSearchResult & {
  yanked: boolean;
  version_created_at: string;
  dependencies: Dependencies;
};
