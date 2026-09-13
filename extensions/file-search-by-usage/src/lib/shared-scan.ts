import os from "node:os";
import path from "node:path";
import { NOISE_SEGMENTS, SHORTCUT_TARGETS } from "./read-dir";
import type { IndexPartialReason } from "./index-refresh";
import { driveReads, DriveReads } from "./drive-reads";

async function sharedRoots(cloudRoot: string, reads: DriveReads) {
  const folders: string[] = [];
  let available = true;
  let foundDrive = false;
  try {
    for (const drive of await reads.readdir(cloudRoot)) {
      if (!drive.name.startsWith("GoogleDrive")) continue;
      foundDrive = true;
      const targets = path.join(cloudRoot, drive.name, SHORTCUT_TARGETS);
      try {
        for (const id of await reads.readdir(targets)) {
          if (id.name.startsWith(".")) continue;
          const idDir = path.join(targets, id.name);
          try {
            for (const entry of await reads.readdir(idDir)) {
              if (!entry.name.startsWith("."))
                folders.push(path.join(idDir, entry.name));
            }
          } catch {
            reads.check();
            available = false;
          }
        }
      } catch (error) {
        reads.check();
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
          available = false;
      }
    }
  } catch {
    reads.check();
    available = false;
  }
  return { folders, available: foundDrive && available };
}

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
    signal?: AbortSignal;
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
    cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
    onProgress,
  } = opts;

  const deadline = Date.now() + budgetMs;
  const paths: string[] = [];
  let partial = false;
  let readFailed = false;
  const reads = driveReads(budgetMs, opts.signal);

  try {
    reads.check();
    const source = await sharedRoots(cloudRoot, reads);
    if (!source.available) {
      return { paths, scannedAt: Date.now(), available: false, partial: false };
    }
    let current = source.folders;
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
                entries: await reads.readdir(dir),
              };
            } catch {
              reads.check();
              return { dir, entries: [], failed: true };
            }
          }),
        );

        for (const { dir, entries, failed = false } of listings) {
          reads.check();
          readFailed ||= failed;
          for (const entry of entries) {
            if (entry.name.startsWith(".")) continue;
            if (NOISE_SEGMENTS.has(entry.name)) continue;
            if (paths.length >= limit) {
              return {
                paths: paths.slice(0, limit),
                scannedAt: Date.now(),
                available: !readFailed,
                partial: true,
                partialReason: "item-limit",
              };
            }
            const full = path.join(dir, entry.name);
            paths.push(full);
            if (entry.isDirectory()) next.push(full);
          }
        }
      }

      current = next;
      reads.check();
      await onProgress?.({
        paths: [...paths],
        scannedAt: Date.now(),
        available: !readFailed,
        partial: true,
        error: readFailed ? "Google Drive could not be fully read" : undefined,
      });
    }

    return {
      paths: paths.slice(0, limit),
      scannedAt: Date.now(),
      available: !readFailed,
      partial: partial || current.length > 0,
      partialReason: current.length > 0 ? "depth-limit" : undefined,
      error: readFailed ? "Google Drive could not be fully read" : undefined,
    };
  } catch (error) {
    if (!reads.stopped) throw error;
    return {
      paths: paths.slice(0, limit),
      scannedAt: Date.now(),
      available: !readFailed,
      partial: true,
      partialReason: opts.signal?.aborted ? undefined : "time-limit",
    };
  } finally {
    reads.dispose();
  }
}
