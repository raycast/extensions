import { Application } from "@raycast/api";

export interface ProjectEntry {
  id: string;
  name: string;
  rootPath: string;
  tags: string[];
  enabled: boolean;
}

export interface CachedProjectEntry {
  name: string;
  fullPath: string;
}

export interface Preferences {
  projectManagerDataPath: string;
  groupProjectsByTag: boolean;
  terminalApp: Application;
  gitClientApp: Application;
  vscodeApp: Application;
  hideProjectsWithoutTag: boolean;
  hideProjectsNotEnabled: boolean;
}
