// Vesslo app data types
export interface VessloApp {
  id: string;
  name: string;
  bundleId: string | null;
  version: string | null;
  targetVersion: string | null;
  developer: string | null;
  path: string;
  icon: string | null; // Base64 encoded PNG
  tags: string[];
  memo: string | null;
  sources: string[];
  appStoreId: string | null;
  homebrewCask: string | null;
  isDeleted: boolean;
  isSkipped: boolean;
  isIgnored: boolean;
}

export interface VessloData {
  exportedAt: string;
  updateCount: number;
  apps: VessloApp[];
}
