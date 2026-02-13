export interface AppInfo {
  name: string;
  displayName: string;
  path: string;
  tags: string[];
}

export interface TagStorage {
  [appName: string]: string[];
}
export interface ExportData {
  exportTime: string;
  totalApps: number;
  appsWithTags: number;
  apps: Array<{
    name: string;
    displayName: string;
    path: string;
    tags: string[];
  }>;
}
