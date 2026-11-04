import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CacheClearResult } from "../types";
import { formatBytes } from "../utils/format";
import { escapeAppleScriptString, executeAppleScript, getRunningPhotoshopName } from "../utils/osascript";

const execFileAsync = promisify(execFile);

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalBytes = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalBytes += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.promises.stat(fullPath);
        totalBytes += stats.size;
      }
    }
  } catch (error) {
    void error;
  }
  return totalBytes;
}

async function clearDirectoryContents(dirPath: string): Promise<void> {
  try {
    if (!fs.existsSync(dirPath)) return;
    const entries = await fs.promises.readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      await fs.promises.rm(fullPath, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    void error;
  }
}

export async function clearPhotoshopCaches(): Promise<CacheClearResult> {
  let purgedMemory = false;
  let memoryPurgeError: string | undefined;
  let diskBytesFreed = 0;
  const clearedPaths: string[] = [];

  const runningApp = await getRunningPhotoshopName();
  if (runningApp) {
    const safeApp = escapeAppleScriptString(runningApp);
    const purgeScript = `tell application "${safeApp}" to do javascript "app.purge(PurgeTarget.ALLCACHES);"`;
    try {
      await executeAppleScript(purgeScript, 4000);
      purgedMemory = true;
    } catch (err: unknown) {
      memoryPurgeError = err instanceof Error ? err.message : String(err);
    }
  }

  const diskCacheDir = path.join(os.homedir(), "Library/Caches/com.adobe.Photoshop");
  if (fs.existsSync(diskCacheDir) && !runningApp) {
    const size = await getDirectorySize(diskCacheDir);
    diskBytesFreed += size;
    await clearDirectoryContents(diskCacheDir);
    clearedPaths.push(diskCacheDir);
  }

  const baseDir =
    typeof environment !== "undefined" && environment.supportPath
      ? environment.supportPath
      : path.join(os.homedir(), "Library/Application Support/com.raycast.macos/photoshop-projects");
  const extensionThumbnails = path.join(baseDir, "thumbnails");
  if (fs.existsSync(extensionThumbnails)) {
    const size = await getDirectorySize(extensionThumbnails);
    diskBytesFreed += size;
    await clearDirectoryContents(extensionThumbnails);
    clearedPaths.push(extensionThumbnails);
  }

  return {
    success: true,
    purgedMemory,
    memoryPurgeError,
    diskBytesFreed,
    formattedFreedSpace: formatBytes(diskBytesFreed),
    clearedPaths,
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
