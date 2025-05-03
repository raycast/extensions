export interface NodeVersionGrouped {
  [group: string]: NodeVersionsInfo[];
}

export interface NodeVersionsInfo {
  title: string;
  type: string | null;
  group: string;
}

export interface Preferences {
  versionManager: string;
}
