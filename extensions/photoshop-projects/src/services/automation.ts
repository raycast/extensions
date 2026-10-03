import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CacheClearResult } from "../types";
import { formatBytes } from "../utils/format";
import { getRunningPhotoshopName, runAppleScript } from "../utils/osascript";

const execFileAsync = promisify(execFile);

interface DirClearResult {
  bytesFreed: number;
  errors: string[];
}

async function clearDirectoryContents(dirPath: string): Promise<DirClearResult> {
  let bytesFreed = 0;
  const errors: string[] = [];

  try {
    if (!fs.existsSync(dirPath)) {
      return { bytesFreed: 0, errors: [] };
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        let entrySize = 0;
        try {
          const stats = await fs.promises.stat(fullPath);
          entrySize = stats.size;
        } catch {
          // Ignore stat failure
        }

        if (entry.isDirectory()) {
          const subResult = await clearDirectoryContents(fullPath);
          bytesFreed += subResult.bytesFreed;
          errors.push(...subResult.errors);
          await fs.promises.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.promises.unlink(fullPath);
          bytesFreed += entrySize;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to remove ${fullPath}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed to read directory ${dirPath}: ${msg}`);
  }

  return { bytesFreed, errors };
}

export async function clearPhotoshopCaches(purgeMemory = true): Promise<CacheClearResult> {
  let purgedMemory = false;
  let diskBytesFreed = 0;
  const clearedPaths: string[] = [];
  const allErrors: string[] = [];

  if (purgeMemory) {
    const runningApp = await getRunningPhotoshopName();
    if (runningApp) {
      const purgeScript = `tell application "${runningApp}" to do javascript "try { app.purge(PurgeTarget.ALLCACHES); 'purged'; } catch(e) { ''; }"`;
      const purgeResult = await runAppleScript(purgeScript, 4000);
      purgedMemory = purgeResult.trim() === "purged";
    }
  }

  const diskCacheDir = path.join(os.homedir(), "Library/Caches/com.adobe.Photoshop");
  if (fs.existsSync(diskCacheDir)) {
    const res = await clearDirectoryContents(diskCacheDir);
    diskBytesFreed += res.bytesFreed;
    allErrors.push(...res.errors);
    clearedPaths.push(diskCacheDir);
  }

  const baseDir =
    typeof environment !== "undefined" && environment.supportPath
      ? environment.supportPath
      : path.join(os.homedir(), "Library/Application Support/com.raycast.macos/photoshop-projects");
  const extensionThumbnails = path.join(baseDir, "thumbnails");
  if (fs.existsSync(extensionThumbnails)) {
    const res = await clearDirectoryContents(extensionThumbnails);
    diskBytesFreed += res.bytesFreed;
    allErrors.push(...res.errors);
    clearedPaths.push(extensionThumbnails);
  }

  return {
    success: allErrors.length === 0,
    purgedMemory,
    diskBytesFreed,
    formattedFreedSpace: formatBytes(diskBytesFreed),
    clearedPaths,
    errors: allErrors,
  };
}

export async function openInPhotoshop(filePath: string): Promise<boolean> {
  try {
    await execFileAsync("/usr/bin/open", ["-a", "Adobe Photoshop", filePath]);
    return true;
  } catch {
    try {
      await execFileAsync("/usr/bin/open", [filePath]);
      return true;
    } catch {
      return false;
    }
  }
}
