export interface Package {
  name: string;
  description?: string;
  platform: string;
  homepage: string;
  latest_download_url: string;
  repository_url: string;
  package_manager_url: string;
  versions: Array<Version>;
}

export interface PackageSearchArguments {
  platform?: string;
}

export interface Version {
  number: string;
  published_at: string;
  spdx_expression: string;
  original_license: string;
  researched_at: string;
  repository_sources: string[];
}

export interface Dependency {
  name: string;
  platform: string;
  requirements: string;
  latest: string;
  deprecated: boolean;
  outdated: boolean;
  kind: string;
}

export interface DependenciesResponse {
  dependencies: Array<Dependency>;
}

export interface Platform {
  name: string;
  project_count: number;
  homepage: string;
  defaultLanguage: string;
}

export interface Subscription {
  project: Package;
}

export interface Preferences {
  token: string;
}
