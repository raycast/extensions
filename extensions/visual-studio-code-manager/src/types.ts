export interface ProjectEntry {
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
  terminalAppPath: string;
  gitClientAppPath: string;
  build: VSCodeBuild;
  projectDirPaths: string;
}

export enum VSCodeBuild {
  Code = "Code",
  Insiders = "Code - Insiders",
  VSCodium = "VSCodium",
}

export interface CacheProjectEntity {
  list: ProjectEntry[];
}
