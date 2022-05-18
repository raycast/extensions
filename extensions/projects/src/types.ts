export interface SourceRepo {
  id: string;
  name: string;
  fullPath: string;
  icon: string;
  type: ProjectType;
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

export enum ProjectType {
  NODE = "node",
  MAVEN = "maven",
  GRADLE = "gradle",
  XCODE = "xcode",
  TAURI = "tauri",
  WAILS = "wails",
  UNKNOWN = "unknown",
}

export enum CacheType {
  ALL_PROJECTS = "all-projects",
  RECENT_PROJECTS = "recent-projects",
  PINNED_PROJECTS = "pinned-projects",
}

export type ProjectConfig = {
  type: string;
  finder: string;
  finderType: string;
  icon: string;
  spotlightQuery: string[];
};
