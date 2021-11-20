export interface ProjectEntry {
  name: string;
  rootPath: string;
  tags: string[];
  enabled: boolean;
}

export interface GitCachedProjectEntry {
  name: string;
  fullPath: string;
}

export interface Preferences {
  projectManagerDataPath: string;
  groupProjectsByTag: boolean;
  terminalAppPath: string;
  gitClientAppPath: string;
}
