export interface AppInfo {
  name: string;
  displayName: string;
  path: string;
  tags: string[];
}

export interface TagStorage {
  [appName: string]: string[];
}
