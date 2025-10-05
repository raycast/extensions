export type QueryOrder =
  | "relevance"
  | "updated"
  | "added"
  | "recommended"
  | "quality"
  | "popularity"
  | "issues"
  | "downloads"
  | "stars";

export type QueryOrderDirection = "descending" | "ascending";

export type Query = {
  android?: string;
  expoGo?: string;
  ios?: string;
  macos?: string;
  fireos?: string;
  tvos?: string;
  visionos?: string;
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
  isMaintained?: string;
  isPopular?: string;
  isRecommended?: string;
  wasRecentlyUpdated?: string;
  minPopularity?: string | number;
  minMonthlyDownloads?: string | number;
  newArchitecture?: string;
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
  tvos?: boolean;
  visionos?: boolean;
  unmaintained?: boolean | string;
  dev?: boolean;
  template?: boolean;
  newArchitecture?: boolean | "new-arch-only";
  newArchitectureNote?: string;
  alternatives?: string[];
  npmPkg?: string;
  examples?: string[];
  images?: string[];
};

export type LibraryType = LibraryDataEntryType & {
  github: {
    name: string;
    fullName: string;
    description: string;
    registry?: string;
    topics?: string[];
    hasTypes?: boolean;
    newArchitecture?: boolean;
    isArchived?: boolean;
    isPrivate?: boolean;
    hasNativeCode: boolean;
    urls: {
      repo: string;
      homepage?: string | null;
    };
    stats: {
      hasIssues: boolean;
      hasWiki: boolean;
      hasSponsorships: boolean;
      hasTopics?: boolean;
      updatedAt: Date | string;
      createdAt: Date | string;
      pushedAt: Date | string;
      issues: number;
      subscribers: number;
      stars: number;
      forks: number;
      dependencies: number;
    };
    license: {
      key: string;
      name: string;
      spdxId: string;
      url: string;
      id: string;
    };
    lastRelease?: {
      name: string;
      tagName: string;
      createdAt: Date | string;
      publishedAt: Date | string;
      isPrerelease: boolean;
    };
  };
  npm?: {
    downloads?: number;
    weekDownloads?: number;
    size?: number;
  };
  npmPkg: string;
  score: number;
  matchingScoreModifiers: string[];
  topicSearchString: string;
  popularity?: number;
  matchScore: number;
};
