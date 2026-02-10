/**
 * Low-level file system utilities for mdfind (Spotlight) queries.
 * The agent orchestrates search strategy; this module just executes.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import { basename, extname } from "path";
import { FileResult } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Format file size to human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Execute a single mdfind query and return file paths.
 *
 * @param query - Spotlight metadata query string
 * @param dirs - Directories to scope the search to. If empty, searches system-wide.
 */
export async function runMdfind(
  query: string,
  dirs: string[],
): Promise<string[]> {
  const allPaths: string[] = [];
  const MAX_BUFFER = 8 * 1024 * 1024;

  if (dirs.length > 0) {
    for (const dir of dirs) {
      try {
        const { stdout } = await execFileAsync(
          "mdfind",
          ["-onlyin", dir, query],
          {
            timeout: 15000,
            maxBuffer: MAX_BUFFER,
          },
        );
        const paths = stdout
          .trim()
          .split("\n")
          .filter((p) => p.length > 0);
        allPaths.push(...paths);
      } catch {
        continue;
      }
    }
  } else {
    try {
      const { stdout } = await execFileAsync("mdfind", [query], {
        timeout: 15000,
        maxBuffer: MAX_BUFFER,
      });
      const paths = stdout
        .trim()
        .split("\n")
        .filter((p) => p.length > 0);
      allPaths.push(...paths);
    } catch {
      // ignore
    }
  }

  return allPaths;
}

/**
 * Convert file paths to FileResult objects with metadata.
 *
 * @param paths - Array of full file paths
 * @param limit - Maximum number of results to return
 */
export async function pathsToResults(
  paths: string[],
  limit: number,
  options?: { preserveOrder?: boolean },
): Promise<FileResult[]> {
  const results: FileResult[] = [];
  const uniquePaths = [...new Set(paths)];

  for (const filePath of uniquePaths) {
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) continue;

      results.push({
        path: filePath,
        name: basename(filePath),
        extension: extname(filePath).replace(".", "").toLowerCase(),
        size: stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
        sizeFormatted: formatSize(stats.size),
      });
      if (results.length >= limit) break;
    } catch {
      continue;
    }
  }

  if (!options?.preserveOrder) {
    results.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }
  return results;
}

/**
 * Convert a page of file paths to FileResult objects, preserving the input order.
 * Also returns the next offset so callers can paginate without repeating paths,
 * even when some paths are skipped (permissions, missing files, etc.).
 */
export async function pathsToResultsPage(
  paths: string[],
  offset: number,
  limit: number,
): Promise<{ results: FileResult[]; nextOffset: number; totalCandidates: number }> {
  const results: FileResult[] = [];
  const uniquePaths = [...new Set(paths)];
  const totalCandidates = uniquePaths.length;

  const start = Math.max(0, Math.floor(offset || 0));
  const max = Math.max(1, Math.floor(limit || 1));

  let idx = start;
  while (idx < totalCandidates && results.length < max) {
    const filePath = uniquePaths[idx];
    idx++;
    if (!filePath) continue;
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) continue;
      results.push({
        path: filePath,
        name: basename(filePath),
        extension: extname(filePath).replace(".", "").toLowerCase(),
        size: stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
        sizeFormatted: formatSize(stats.size),
      });
    } catch {
      continue;
    }
  }

  return { results, nextOffset: idx, totalCandidates };
}

/**
 * Find directories matching a name pattern using mdfind.
 *
 * @param name - Name pattern to search for in directory names
 * @param baseDirs - Optional directories to scope the search to
 */
export async function findDirectories(
  name: string,
  baseDirs: string[],
): Promise<string[]> {
  const foundDirs: string[] = [];
  const query = `kMDItemFSName == "*${name}*"cd && kMDItemContentType == "public.folder"`;

  if (baseDirs.length > 0) {
    for (const dir of baseDirs) {
      try {
        const { stdout } = await execFileAsync(
          "mdfind",
          ["-onlyin", dir, query],
          {
            timeout: 10000,
            maxBuffer: 1024 * 1024,
          },
        );
        const paths = stdout
          .trim()
          .split("\n")
          .filter((p) => p.length > 0);
        foundDirs.push(...paths);
      } catch {
        continue;
      }
    }
  } else {
    // Search system-wide
    try {
      const { stdout } = await execFileAsync("mdfind", [query], {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      const paths = stdout
        .trim()
        .split("\n")
        .filter((p) => p.length > 0);
      foundDirs.push(...paths);
    } catch {
      // ignore
    }

    // Also check common locations
    const home = process.env.HOME || "";
    const commonDirs = [
      `${home}/Downloads`,
      `${home}/Documents`,
      `${home}/Desktop`,
    ];
    for (const dir of commonDirs) {
      try {
        const { stdout } = await execFileAsync(
          "mdfind",
          ["-onlyin", dir, query],
          {
            timeout: 5000,
            maxBuffer: 512 * 1024,
          },
        );
        const paths = stdout
          .trim()
          .split("\n")
          .filter((p) => p.length > 0);
        foundDirs.push(...paths);
      } catch {
        continue;
      }
    }
  }

  return [...new Set(foundDirs)];
}
