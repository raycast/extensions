import { readdirSync, statSync, existsSync, mkdirSync, utimesSync } from "fs";
import { join } from "path";
import { TryDirectory } from "../types";
import { getTryPath } from "./constants";

export async function getTryDirectories(): Promise<TryDirectory[]> {
  const tryPath = getTryPath();
  if (!existsSync(tryPath)) {
    return [];
  }

  const entries = readdirSync(tryPath);
  const directories: TryDirectory[] = [];

  for (const name of entries) {
    if (name.startsWith(".")) continue;

    const fullPath = join(tryPath, name);
    try {
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) continue;

      const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);

      directories.push({
        name,
        path: fullPath,
        mtime: stat.mtime,
        ctime: stat.ctime,
        datePrefix: dateMatch?.[1],
        displayName: dateMatch?.[2] || name,
      });
    } catch {
      continue;
    }
  }

  return directories.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

/**
 * Touch a directory to update its mtime (matching try CLI behavior)
 */
export function touchDirectory(path: string): void {
  const now = new Date();
  utimesSync(path, now, now);
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function generateDatePrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolve a unique name by handling collisions.
 * If name ends with digits (e.g., test1), increment the number (test2, test3...).
 * Otherwise, append -2, -3, etc.
 */
export function resolveUniqueName(name: string, exists: (candidate: string) => boolean): string {
  if (!exists(name)) {
    return name;
  }

  const match = name.match(/^(.*?)(\d+)$/);

  if (match) {
    // Name ends with digits, increment the number
    const stem = match[1];
    let num = parseInt(match[2], 10) + 1;
    while (exists(`${stem}${num}`)) {
      num++;
    }
    return `${stem}${num}`;
  }

  // No numeric suffix, use -2, -3 style
  let suffix = 2;
  while (exists(`${name}-${suffix}`)) {
    suffix++;
  }
  return `${name}-${suffix}`;
}

export function createTryDirectory(name: string): string {
  const tryPath = getTryPath();
  const datePrefix = generateDatePrefix();
  const sanitizedName = name.replace(/\s+/g, "-").toLowerCase();

  const uniqueName = resolveUniqueName(`${datePrefix}-${sanitizedName}`, (candidate) =>
    existsSync(join(tryPath, candidate)),
  );

  const fullPath = join(tryPath, uniqueName);
  mkdirSync(fullPath, { recursive: true });

  return fullPath;
}
