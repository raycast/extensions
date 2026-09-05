import fs from "node:fs/promises";
import path from "node:path";
import { NOISE_SEGMENTS, sharedCloudFolderResult } from "./read-dir";
import type { IndexPartialReason } from "./index-refresh";

export type SharedIndex = {
  /** Every path inside every Google Drive shared folder, files and folders. */
  paths: string[];
  scannedAt: number;
  /** True when Google Drive's shared-folder targets were accessible. */
  available: boolean;
  /** True if a bound cut the scan short, so the index is known-incomplete. */
  partial: boolean;
  partialReason?: IndexPartialReason;
  error?: string;
};

const CONCURRENCY = 8;

/** Builds a bounded index of Google Drive shared-folder contents. */
export async function scanSharedFolders(
  opts: {
    maxDepth?: number;
    limit?: number;
    budgetMs?: number;
    cloudRoot?: string;
    onProgress?: (index: SharedIndex) => void | Promise<void>;
  } = {},
): Promise<SharedIndex> {
  const {
    maxDepth = 6,
    limit = 40_000,
    budgetMs = 120_000,
    cloudRoot,
    onProgress,
  } = opts;

  const deadline = Date.now() + budgetMs;
  const paths: string[] = [];
  let partial = false;
  let readFailed = false;

  const source = sharedCloudFolderResult(cloudRoot);
  if (!source.available) {
    return { paths, scannedAt: Date.now(), available: false, partial: false };
  }
  let current = source.folders.map((place) => place.path);
  // Include roots so the index is self-contained.
  paths.push(...current);

  for (let depth = 0; depth <= maxDepth && current.length > 0; depth++) {
    const next: string[] = [];

    for (let i = 0; i < current.length; i += CONCURRENCY) {
      if (Date.now() > deadline) {
        partial = true;
        return {
          paths: paths.slice(0, limit),
          scannedAt: Date.now(),
          available: !readFailed,
          partial,
          partialReason: "time-limit",
          error: readFailed
            ? "Google Drive could not be fully read"
            : undefined,
        };
      }
      if (paths.length >= limit) {
        partial = true;
        return {
          paths: paths.slice(0, limit),
          scannedAt: Date.now(),
          available: !readFailed,
          partial,
          partialReason: "item-limit",
          error: readFailed
            ? "Google Drive could not be fully read"
            : undefined,
        };
      }

      const batch = current.slice(i, i + CONCURRENCY);
      const listings = await Promise.all(
        batch.map(async (dir) => {
          try {
            return {
              dir,
              entries: await fs.readdir(dir, { withFileTypes: true }),
            };
          } catch {
            return { dir, entries: [], failed: true };
          }
        }),
      );

      for (const { dir, entries, failed = false } of listings) {
        readFailed ||= failed;
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          if (NOISE_SEGMENTS.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          paths.push(full);
          if (entry.isDirectory()) next.push(full);
        }
      }
    }

    current = next;
    await onProgress?.({
      paths: [...paths],
      scannedAt: Date.now(),
      available: !readFailed,
      partial: true,
      error: readFailed ? "Google Drive could not be fully read" : undefined,
    });
  }

  return {
    paths,
    scannedAt: Date.now(),
    available: !readFailed,
    partial: partial || current.length > 0,
    partialReason: current.length > 0 ? "depth-limit" : undefined,
    error: readFailed ? "Google Drive could not be fully read" : undefined,
  };
}
