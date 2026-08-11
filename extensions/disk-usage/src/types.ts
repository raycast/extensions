import type { PathLike } from "node:fs";

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

export interface DirectorySnapshot {
  accessible: FileNode[];
  restricted: FileNode[];
}

export interface DiskUsageContext {
  volume: Volume;
  activePath: string;
  heapUsed: string;
  needsScan: boolean;
  error: string;
  isProcessingDeletion: boolean;
}

export type DiskUsageEvent =
  | { type: "REFRESH" }
  | { type: "RETRY" }
  | { type: "SCAN_PROGRESS"; path: string; heap: string }
  | { type: "SCAN_SUCCESS" }
  | { type: "SCAN_FAILURE"; error: string }
  | { type: "DELETE_ITEMS"; paths: PathLike[] }
  | { type: "ITEM_MISSING"; path: string; bytes: number };
