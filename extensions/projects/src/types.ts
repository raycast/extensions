export interface SourceRepo {
  id: string;
  name: string;
  fullPath: string;
  icon: string;
  type: string;
  openWithKey: string;
}

export interface RepoSearchResponse {
  pinned?: { sectionTitle: string; repos: SourceRepo[] };
  all?: { sectionTitle: string; repos: SourceRepo[] };
  recent?: { sectionTitle: string; repos: SourceRepo[] };
}

export interface OpenWith {
  name: string;
  path: string;
  bundleId: string;
}

export interface Preferences {
  repoScanPath: string;
  openDefaultWith: OpenWith;
  openNodeWith?: OpenWith;
  openXcodeWith?: OpenWith;
  openMavenWith?: OpenWith;
  openGradleWith?: OpenWith;
  openWailsWith?: OpenWith;
  openTauriWith?: OpenWith;
  openWith2?: OpenWith;
  openWith3?: OpenWith;
}

export enum CacheType {
  ALL_PROJECTS = "all-projects",
  RECENT_PROJECTS = "recent-projects",
  PINNED_PROJECTS = "pinned-projects",
}

export type ProjectTypeConfig = {
  type: string;
  finder: string;
  finderType: string;
  icon: string;
  spotlightQuery: string[];
  openWithKey: string;
  singleFileProject?: boolean;
};

export type ListType = "pinned" | "recent" | "all";
