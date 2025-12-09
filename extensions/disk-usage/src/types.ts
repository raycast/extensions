import { PathLike } from "fs";

export interface FileNode {
  path: string;
  bytes: number;
  formattedSize: string;
  name: string;
}

export interface Volume {
  freeBytes: number;
  totalBytes: number;
  usageLabel: string;
}

export interface FolderSnapshot {
  accessible: FileNode[];
  restricted: FileNode[];
}

export type FileSystemIndex = Record<string, FolderSnapshot>;

export interface DiskUsageContext {
  fsIndex: FileSystemIndex;
  volume: Volume;
  error: string;
  activePath: string;
  isProcessingDeletion: boolean;
}

export type DiskUsageEvent =
  | { type: "REFRESH" }
  | { type: "CACHE_HIT" }
  | { type: "CACHE_MISS" }
  | { type: "SCAN_PROGRESS"; path: string }
  | { type: "SCAN_SUCCESS"; data: FileSystemIndex }
  | { type: "SCAN_FAILURE"; error: unknown }
  | { type: "DELETE_ITEMS"; paths: PathLike[] }
  | { type: "RETRY" };
