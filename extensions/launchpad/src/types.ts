export interface AppEntry {
  bundleId: string;
  name: string;
  path: string;
}

export interface Folder {
  id: string;
  name: string;
  apps: AppEntry[];
}

export interface LaunchpadConfig {
  folders: Folder[];
  uncategorized: AppEntry[];
  hidden: AppEntry[]; // full entries so unhide can restore them without re-scanning
}
