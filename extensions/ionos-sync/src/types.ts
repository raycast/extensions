export interface Project {
  id: string;
  name: string;
  localPath: string;
  remotePath: string;
  excludes: string[];
  deleteOnSync: boolean; // false for root-level remotes like ~/
  lastSync?: SyncRecord;
}

export interface SyncRecord {
  timestamp: string; // ISO string
  direction: SyncDirection;
  mode: SyncMode;
  success: boolean;
  linesOutput: number;
}

export type SyncDirection = "push" | "pull";
export type SyncMode = "dry" | "live";

export interface StorageData {
  version: number;
  projects: Project[];
}

export const STORAGE_KEY = "ionos-sync-data";
export const DATA_VERSION = 1;

export const DEFAULT_EXCLUDES = [".git", ".DS_Store", "node_modules", ".env*"];
