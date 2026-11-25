import fs from "node:fs";
import path from "node:path";
import { currentPlatformAdapter } from "../platforms";
import { IPlatformAdapter } from "../platforms/types";
import { CacheClearResult } from "../types";
import { formatFileSize } from "../utils/format";

async function getDirectorySize(dirPath: string): Promise<number> {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += await getDirectorySize(full);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(full);
          total += stat.size;
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  } catch {
    // Inaccessible directory
  }
  return total;
}

interface EmptyDirectoryResult {
  freed: number;
  failedCount: number;
  failedPaths: string[];
}

async function emptyDirectory(dirPath: string): Promise<EmptyDirectoryResult> {
  const result: EmptyDirectoryResult = {
    freed: 0,
    failedCount: 0,
    failedPaths: [],
  };

  if (!fs.existsSync(dirPath)) return result;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          const subResult = await emptyDirectory(full);
          result.freed += subResult.freed;
          result.failedCount += subResult.failedCount;
          result.failedPaths.push(...subResult.failedPaths);
          try {
            await fs.promises.rmdir(full);
          } catch {
            result.failedCount += 1;
            result.failedPaths.push(full);
          }
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          const stat = await fs.promises.stat(full).catch(() => null);
          await fs.promises.unlink(full);
          if (stat) {
            result.freed += stat.size;
          }
        }
      } catch {
        result.failedCount += 1;
        result.failedPaths.push(full);
      }
    }
  } catch {
    result.failedCount += 1;
    result.failedPaths.push(dirPath);
  }

  return result;
}

export async function clearPremiereMediaCaches(
  adapter: IPlatformAdapter = currentPlatformAdapter,
): Promise<CacheClearResult> {
  const result: CacheClearResult = {
    success: true,
    mediaCacheFreed: 0,
    peakFilesFreed: 0,
    totalFreed: 0,
    formattedFreedSpace: "0 B",
    clearedDirectories: [],
    failedCount: 0,
    failedPaths: [],
  };

  try {
    const cacheDirs = adapter.getMediaCacheDirectories();
    let total = 0;
    let totalFailed = 0;

    for (const dir of cacheDirs) {
      if (!fs.existsSync(dir)) continue;

      const isPeak = dir.toLowerCase().includes("peak");
      const { freed, failedCount, failedPaths } = await emptyDirectory(dir);

      if (isPeak) {
        result.peakFilesFreed += freed;
      } else {
        result.mediaCacheFreed += freed;
      }

      total += freed;
      totalFailed += failedCount;
      if (failedPaths.length > 0) {
        result.failedPaths?.push(...failedPaths);
      }
      result.clearedDirectories.push(dir);
    }

    result.totalFreed = total;
    result.formattedFreedSpace = formatFileSize(total);
    result.failedCount = totalFailed;
    if (totalFailed > 0) {
      result.success = false;
    }
  } catch (err: unknown) {
    result.success = false;
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

export async function calculateMediaCacheSize(
  adapter: IPlatformAdapter = currentPlatformAdapter,
): Promise<{ totalBytes: number; formattedSize: string; directories: string[] }> {
  const dirs = adapter.getMediaCacheDirectories();
  let total = 0;

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      total += await getDirectorySize(dir);
    }
  }

  return {
    totalBytes: total,
    formattedSize: formatFileSize(total),
    directories: dirs,
  };
}
