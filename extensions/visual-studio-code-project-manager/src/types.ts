export interface ProjectEntry {
  name: string;
  rootPath: string;
  tags: string[];
  enabled: boolean;
}

export interface Preferences {
  projectManagerDataPath: string;
  groupProjectsByTag: boolean;
}
