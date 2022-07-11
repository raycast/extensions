export interface Package {
  name: string;
  description?: string;
  platform: string;
  homepage: string;
  repositoryUrl: string;
  packageManagerUrl: string;
  versions: Array<Version>;
}

export interface Version {
  number: string;
  published_at: string;
  spdx_expression: string;
  original_license: string;
  researched_at: string;
  repository_sources: string[];
}

export interface Platform {
  name: string;
  projectCount: number;
  homepage: string;
  defaultLanguage: string;
}
