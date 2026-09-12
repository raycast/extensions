import type { SourceFile } from "./scan.js";

export interface PerceptualInfo {
  peers: string[];
  best: boolean;
}
export interface HashCacheEntry {
  size: number;
  mtimeMs: number;
  hash: bigint | null;
}
export function isHashableImage(file: SourceFile): boolean;
export function hashImages(
  files: SourceFile[],
  options?: { onProgress?: (done: number) => void; cache?: Map<string, HashCacheEntry> },
): Promise<Map<string, bigint>>;
export function loadHashCache(destDir: string): Map<string, HashCacheEntry>;
export function saveHashCache(destDir: string, cache: Map<string, HashCacheEntry>, files: SourceFile[]): void;
export function clusterByHash(
  hashes: Map<string, bigint>,
  filesByPath: Map<string, SourceFile>,
  threshold?: number,
): Map<string, PerceptualInfo>;
