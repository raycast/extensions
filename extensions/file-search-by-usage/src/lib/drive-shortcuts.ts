import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { NOISE_SEGMENTS, SHORTCUT_TARGETS } from "./read-dir";
import type { IndexPartialReason } from "./index-refresh";

export type Shortcut = {
  /** Path to the user-visible shortcut. */
  path: string;
  /** User-visible shortcut name. */
  name: string;
  /** Target under .shortcut-targets-by-id. */
  target: string;
};

export type ShortcutIndex = {
  shortcuts: Shortcut[];
  scannedAt: number;
  /** True when at least one Google Drive target directory was accessible. */
  available: boolean;
  /** True if a bound cut the scan short, so the index is known-incomplete. */
  partial: boolean;
  partialReason?: IndexPartialReason;
  error?: string;
};

const CONCURRENCY = 8;

export async function googleDriveRoots(
  cloudRoot: string,
): Promise<{ roots: string[]; available: boolean }> {
  let drives: string[];
  try {
    drives = (await fs.readdir(cloudRoot, { withFileTypes: true }))
      .filter((entry) => entry.name.startsWith("GoogleDrive"))
      .map((entry) => path.join(cloudRoot, entry.name));
  } catch {
    return { roots: [], available: false };
  }

  const roots: string[] = [];
  let readFailed = false;
  for (const drive of drives) {
    try {
      const stats = await fs.stat(path.join(drive, SHORTCUT_TARGETS));
      if (stats.isDirectory()) roots.push(drive);
      else readFailed = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        readFailed = true;
      }
      continue;
    }
  }
  return { roots, available: drives.length > 0 && !readFailed };
}

/** Finds Google Drive shortcuts that Spotlight cannot index. */
export async function scanShortcuts(
  opts: {
    maxDepth?: number;
    budgetMs?: number;
    cloudRoot?: string;
    /** Receives a partial index after each completed depth level. */
    onProgress?: (index: ShortcutIndex) => void | Promise<void>;
  } = {},
): Promise<ShortcutIndex> {
  const {
    maxDepth = 8,
    budgetMs = 240_000,
    cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
    onProgress,
  } = opts;
  const deadline = Date.now() + budgetMs;
  const shortcuts: Shortcut[] = [];
  let partial = false;

  const source = await googleDriveRoots(cloudRoot);
  let readFailed = !source.available;
  if (!source.available && source.roots.length === 0) {
    return {
      shortcuts,
      scannedAt: Date.now(),
      available: false,
      partial: false,
    };
  }

  let current = source.roots;
  for (let depth = 0; depth <= maxDepth && current.length > 0; depth++) {
    const next: string[] = [];

    for (let i = 0; i < current.length; i += CONCURRENCY) {
      if (Date.now() > deadline) {
        partial = true;
        return {
          shortcuts,
          scannedAt: Date.now(),
          available: !readFailed,
          partial,
          partialReason: "time-limit",
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

          if (entry.isSymbolicLink()) {
            try {
              const target = await fs.readlink(full);
              if (target.includes(SHORTCUT_TARGETS)) {
                shortcuts.push({ path: full, name: entry.name, target });
              }
            } catch {
              // Ignore unreadable or dangling shortcuts.
            }
            continue;
          }

          if (entry.isDirectory()) next.push(full);
        }
      }
    }

    current = next;
    // Persistable checkpoint after each depth level.
    await onProgress?.({
      shortcuts: [...shortcuts],
      scannedAt: Date.now(),
      available: !readFailed,
      partial: true,
      error: readFailed ? "Google Drive could not be fully read" : undefined,
    });
  }

  return {
    shortcuts,
    scannedAt: Date.now(),
    available: !readFailed,
    partial: partial || current.length > 0,
    partialReason: current.length > 0 ? "depth-limit" : undefined,
    error: readFailed ? "Google Drive could not be fully read" : undefined,
  };
}
