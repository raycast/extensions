import { lstat, opendir } from "node:fs/promises";
import path from "node:path";

import { mapWithConcurrency } from "./async";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function directorySize(target: string, signal?: AbortSignal): Promise<number> {
  signal?.throwIfAborted();
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) return 0;
  if (!stats.isDirectory()) return stats.size;

  let total = 0;
  const pendingDirectories = [target];
  for (let current = pendingDirectories.pop(); current !== undefined; current = pendingDirectories.pop()) {
    signal?.throwIfAborted();
    const directory = await opendir(current);
    const files: string[] = [];
    for await (const entry of directory) {
      if (entry.isSymbolicLink()) continue;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) pendingDirectories.push(child);
      else files.push(child);
    }
    const sizes = await mapWithConcurrency(
      files,
      32,
      async (file) => {
        try {
          return (await lstat(file)).size;
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === "ENOENT" || code === "EACCES" || code === "EPERM") return 0;
          throw error;
        }
      },
      signal,
    );
    total += sizes.reduce((sum, size) => sum + size, 0);
  }
  return total;
}

export async function modifiedAt(target: string): Promise<Date> {
  return (await lstat(target)).mtime;
}

export function isOlderThan(date: Date, days: number, now = new Date()): boolean {
  return now.getTime() - date.getTime() >= days * 86_400_000;
}
