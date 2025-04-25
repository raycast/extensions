import { Application } from "@raycast/api";

export interface ProjectItemProperties {
  project: DirectoryInfo;
  preferences: ExtPreferences;
  additionalActions?: (path: string) => React.ReactNode[];
  key?: string;
}

export interface SubSectionProperties {
  title: string;
  subSectionItems: string[];
  additionalActions?: (path: string) => React.ReactNode[];
}

export interface DirectoryInfo {
  path: string;
  name: string;
  parent: string;
}

export interface DirectoryMap {
  [parent: string]: DirectoryInfo[];
}

export interface ExtPreferences {
  projectsDirectory: string;
  ide: Application;
  ide2: Application;
  ide3: Application;
  projectContainsFilter: string;
  recentlyOpenLimit: number;
  searchDepth: number;
}
