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

async function emptyDirectory(dirPath: string): Promise<number> {
  if (!fs.existsSync(dirPath)) return 0;
  let freed = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          freed += await emptyDirectory(full);
          await fs.promises.rmdir(full).catch(() => {});
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(full);
          await fs.promises.unlink(full);
          freed += stat.size;
        }
      } catch {
        // Skip locked files
      }
    }
  } catch {
    // Inaccessible directory
  }
  return freed;
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
  };

  try {
    const cacheDirs = adapter.getMediaCacheDirectories();
    let total = 0;

    for (const dir of cacheDirs) {
      if (!fs.existsSync(dir)) continue;

      const isPeak = dir.toLowerCase().includes("peak");
      const freed = await emptyDirectory(dir);

      if (isPeak) {
        result.peakFilesFreed += freed;
      } else {
        result.mediaCacheFreed += freed;
      }

      total += freed;
      result.clearedDirectories.push(dir);
    }

    result.totalFreed = total;
    result.formattedFreedSpace = formatFileSize(total);
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
