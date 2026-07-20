import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import type { ScanResult } from "../types";
import { expandHome, formatBytes, getSizeAsync, isDirPresent } from "../utils/disk";

/** Minimum size to report a cache entry (10 MB) */
const MIN_REPORT_SIZE = 10 * 1024 * 1024;

/** System cache prefixes to skip (Apple-managed, regenerate quickly) */
const SKIP_PREFIXES = ["com.apple.", "CloudKit", "SiriTTS"];

/** Cache subdirectories already handled by other scanners — skip to avoid duplicates */
const SKIP_ENTRIES = new Set(["Yarn", "Homebrew", "CocoaPods", "pip", "composer"]);

export async function scanSystem(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // User Logs
  const logsPath = expandHome("~/Library/Logs");
  if (isDirPresent(logsPath)) {
    const size = await getSizeAsync(logsPath);
    if (size > MIN_REPORT_SIZE) {
      results.push({
        id: "user-logs",
        title: "User Log Files",
        description: `Application and system log files (${formatBytes(size)}). Safe to clean — apps recreate logs as needed.`,
        category: "system",
        path: logsPath,
        size,
        risk: "safe",
        available: true,
        cleanCommand: `rm -rf "${logsPath}"`,
        cleanAction: { type: "rmrf" },
        icon: "gear",
      });
    }
  }

  // Top-level user cache consumers — single du call for all at once
  const cachesPath = expandHome("~/Library/Caches");
  if (isDirPresent(cachesPath)) {
    const entries = await listTopLevelCacheEntries(cachesPath);
    for (const { name, size } of entries) {
      if (SKIP_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
      if (SKIP_ENTRIES.has(name)) continue;
      if (size < MIN_REPORT_SIZE) continue;

      const entryPath = join(cachesPath, name);
      results.push({
        id: `cache-${name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
        title: `${name} Cache`,
        description: `Application cache (${formatBytes(size)}). Generally safe to clean when the app is not running.`,
        category: "system",
        path: entryPath,
        size,
        risk: "moderate",
        available: true,
        cleanCommand: `rm -rf ~/Library/Caches/"${name}"`,
        cleanAction: { type: "rmrf" },
        icon: "gear",
      });
    }
  }

  results.sort((a, b) => b.size - a.size);
  return results;
}

/**
 * List all top-level entries in a cache directory with their sizes
 * using a single `du -sk -d 1` call (much faster than N calls to getSize).
 */
const execFileAsync = promisify(execFile);

async function listTopLevelCacheEntries(cachesPath: string): Promise<{ name: string; size: number }[]> {
  try {
    const { stdout } = await execFileAsync("du", ["-sk", "-d", "1", cachesPath], { timeout: 60000 });
    const output = String(stdout);

    const entries: { name: string; size: number }[] = [];
    for (const line of output.trim().split("\n")) {
      const parts = line.split("\t");
      if (parts.length !== 2) continue;
      const kb = parseInt(parts[0], 10);
      const path = parts[1];
      if (isNaN(kb) || path === cachesPath) continue;
      const name = path.substring(cachesPath.length + 1);
      if (!name || name.includes("/")) continue;
      entries.push({ name, size: kb * 1024 });
    }
    return entries;
  } catch {
    return [];
  }
}
