import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { FileItem } from "./types";

function expandTilde(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function scanDir(dir: string): FileItem[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && !e.name.startsWith("."))
      .map((e) => {
        const fullPath = path.join(dir, e.name);
        const stat = fs.statSync(fullPath);
        return { path: fullPath, name: e.name, mtime: stat.mtimeMs };
      });
  } catch {
    return [];
  }
}

/**
 * Returns recent files from the screenshot dir, Downloads (if enabled), and additionalDirs,
 * sorted by mtime descending, deduplicated, and limited to maxRecentFiles.
 */
export function getRecentFiles(options: {
  screenshotDir: string;
  includeDownloads: boolean;
  additionalDirs: string;
  maxRecentFiles: string;
}): FileItem[] {
  const max = Math.max(1, parseInt(options.maxRecentFiles, 10) || 30);

  const dirs: string[] = [options.screenshotDir];
  if (options.includeDownloads) {
    dirs.push(path.join(os.homedir(), "Downloads"));
  }
  const extraDirs = options.additionalDirs
    .split(":")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map(expandTilde);
  dirs.push(...extraDirs);

  const seen = new Set<string>();
  const allFiles: FileItem[] = [];

  for (const dir of dirs) {
    const items = scanDir(dir);
    for (const item of items) {
      if (!seen.has(item.path)) {
        seen.add(item.path);
        allFiles.push(item);
      }
    }
  }

  allFiles.sort((a, b) => b.mtime - a.mtime);
  return allFiles.slice(0, max);
}
