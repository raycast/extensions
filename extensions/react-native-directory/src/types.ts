export type QueryOrder =
  | "relevance"
  | "updated"
  | "added"
  | "released"
  | "quality"
  | "popularity"
  | "issues"
  | "downloads"
  | "stars"
  | "dependencies"
  | "size";

export type QueryOrderDirection = "descending" | "ascending";

export type Query = {
  android?: string;
  expoGo?: string;
  ios?: string;
  macos?: string;
  fireos?: string;
  tvos?: string;
  visionos?: string;
  vegaos?: string;
  horizon?: string;
  web?: string;
  windows?: string;
  order?: QueryOrder;
  direction?: QueryOrderDirection;
  search?: string;
  offset?: string | number | null;
  limit?: string | number;
  hasExample?: string;
  hasImage?: string;
  hasTypes?: string;
  hasNativeCode?: string;
  configPlugin?: string;
  isMaintained?: string;
  isPopular?: string;
  isRecommended?: string;
  wasRecentlyUpdated?: string;
  minPopularity?: string | number;
  minMonthlyDownloads?: string | number;
  newArchitecture?: string;
  skipLibs?: string;
  skipTools?: string;
  skipTemplates?: string;
  expoModule?: string;
  nitroModule?: string;
  turboModule?: string;
  nightlyProgram?: string;
};

export type LibraryDataEntryType = {
  githubUrl: string;
  ios?: boolean;
  android?: boolean;
  web?: boolean;
  expoGo?: boolean;
  windows?: boolean;
  macos?: boolean;
  fireos?: boolean;
  horizon?: boolean;
  tvos?: boolean;
  visionos?: boolean;
  vegaos?: boolean | string;
  unmaintained?: boolean;
  dev?: boolean;
  template?: boolean;
  newArchitecture?: boolean | "new-arch-only";
  newArchitectureNote?: string;
  configPlugin?: boolean | string;
  alternatives?: string[];
  npmPkg?: string;
  examples?: string[];
  images?: string[];
};

export type LibraryLicenseType = {
  key: string;
  name: string;
  spdxId: string;
  url: string;
  id: string;
};

export type LibraryType = LibraryDataEntryType & {
  github: {
    name: string;
    fullName: string;
    description?: string;
    registry?: string;
    topics?: string[];
    hasTypes?: boolean;
    newArchitecture?: boolean;
    isArchived?: boolean;
    isPrivate?: boolean;
    hasNativeCode: boolean;
    hasReadme?: boolean;
    configPlugin?: boolean;
    moduleType?: "expo" | "nitro" | "turbo";
    urls: {
      repo: string;
      homepage?: string | null;
    };
    stats: {
      hasIssues: boolean;
      hasWiki: boolean;
      hasProjects: boolean;
      hasSponsorships: boolean;
      hasDiscussions: boolean;
      hasVulnerabilityAlerts: boolean;
      hasTopics?: boolean;
      updatedAt: Date | string;
      createdAt: Date | string;
      pushedAt: Date | string;
      issues: number;
      subscribers: number;
      stars: number;
      forks: number;
      dependencies?: number;
    };
    license: LibraryLicenseType;
  };
  npm?: {
    downloads?: number;
    weekDownloads?: number;
    size?: number;
    versionsCount?: number;
    latestRelease?: string;
    latestReleaseDate?: string;
    hasReadme?: boolean;
  };
  npmPkg: string;
  score: number;
  matchingScoreModifiers: string[];
  topicSearchString: string;
  popularity?: number;
  matchScore?: number;
  nightlyProgram?: boolean;
};
