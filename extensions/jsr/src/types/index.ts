export type NameAndScope = {
  scope: string;
  name: string;
};

export type RuntimeCompat = {
  browser?: boolean;
  deno?: boolean;
  node?: boolean;
  workerd?: boolean;
  bun?: boolean;
};

export type DescriptionAndRuntimeCompat = {
  description: string;
  runtimeCompat?: RuntimeCompat;
};

export type SearchResultDocument = NameAndScope &
  DescriptionAndRuntimeCompat & {
    score?: number;
    id: string;
  };

export type SearchResult = {
  id: number;
  score: number;
  document: SearchResultDocument;
};

export type ErrorResult = {
  message: string;
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

export type Package = NameAndScope &
  DescriptionAndRuntimeCompat & {
    githubRepository: GitHubRepository | null;
    updatedAt: string | null;
    createdAt: string | null;
    versionCount: number | null;
    dependencyCount: number | null;
    dependentCount: number | null;
    score: number | null;
    latestVersion: string | null;
    whenFeatured: string | null;
    isArchived: boolean | null;
    readmeSource: "readme" | "jsdoc" | null;
  };

export type VersionPackageBase = {
  scope: string;
  package: string;
  version: string;
  yanked: boolean;
  usesNpm: boolean;
  newerVersionsCount?: number;
  readmePath: string | null;
  updatedAt: string;
  createdAt: string;
};

export type VersionManifestEntry = {
  size: number;
  checksum: string;
};

export type VersionMeta = {
  manifest: Record<string, VersionManifestEntry>;
  exports: Record<string, string>;
  moduleGraph2?: unknown;
};

export type DownloadKind = "jsr_meta" | "npm_tarball";

export type DownloadDataPoint = {
  timeBucket: string;
  kind: DownloadKind;
  count: number;
};

export type RecentVersionDownloads = {
  version: string;
  downloads: DownloadDataPoint[];
};

export type DownloadsResponse = {
  total: DownloadDataPoint[];
  recentVersions: RecentVersionDownloads[];
};

export type VersionPackage = VersionPackageBase & {
  user: {
    id: string;
    name: string;
    githubId: string | null;
    avatarUrl: string | null;
    updatedAt: string;
    createdAt: string;
  };
};

export type PackageScore = {
  hasReadme: boolean;
  hasReadmeExamples: boolean;
  allEntrypointsDocs: boolean;
  percentageDocumentedSymbols: number;
  allFastCheck: boolean;
  hasProvenance: boolean;
  hasDescription: boolean;
  atLeastOneRuntimeCompatible: boolean;
  multipleRuntimesCompatible: boolean;
  total: number;
};

export type Dependency = {
  kind: "jsr" | "npm";
  name: string;
  constraint: string;
  path: string;
};

export type Dependent = {
  scope: string;
  package?: string;
  versions: string[];
  totalVersions: number;
};

export type ApiResults<T> = {
  items: T[];
  total: number;
};

export type StatsData = {
  newest: Array<Package>;
  featured: Array<Package>;
};

export type WithKey<T> = T & { key: string };
