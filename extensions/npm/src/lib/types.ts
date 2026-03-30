export interface InstalledPackage {
  name: string;
  version: string;
  description?: string;
  license?: string;
  path?: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  binNames: string[];
  latestVersion?: string;
  wantedVersion?: string;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  location?: string;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  keywords: string[];
  date?: string;
  publisher?: string;
  maintainers: string[];
  npmUrl: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  score?: number;
  quality?: number;
  popularity?: number;
  maintenance?: number;
}
