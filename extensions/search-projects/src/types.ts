export interface SourceRepo {
  name: string;
  fullPath: string;
  icon: string;
  type: ProjectType;
}

export interface RepoSearchResponse {
  sectionTitle: string;
  repos: SourceRepo[];
}

export interface OpenWith {
  name: string;
  path: string;
  bundleId: string;
}

export interface Preferences {
  repoScanPath: string;
  repoScanDepth?: number;
  openNodeWith: OpenWith;
  openMavenWith: OpenWith;
  openGradleWith: OpenWith;
  openWith1: OpenWith;
  openWith2?: OpenWith;
  openWith3?: OpenWith;
}

export enum ProjectType {
  NODE = "node",
  MAVEN = "maven",
  GRADLE = "gradle",
  UNKNOWN = "unknown",
}
