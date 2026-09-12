import * as fs from "node:fs";
import * as path from "node:path";
import { getChromiumProcessArgs, isProfileInUse } from "../chromium/processes";
import { mapWithConcurrency } from "../utils/concurrency";
import { reportError } from "../utils/reportError";
import { readRegistry } from "./autoCleanup";

const SIZE_COMPUTE_CONCURRENCY = 4;

export type ProfileInfo = {
  id: string;
  path: string;
  size: number;
  createdAt: Date;
  inUse: boolean;
  autoCleanup: boolean;
};

export async function computeDirectorySize(dir: string): Promise<number> {
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return 0;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await computeDirectorySize(entryPath);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      try {
        const stats = await fs.promises.lstat(entryPath);
        total += stats.size;
      } catch {
        // Skip entries that disappear mid-walk.
      }
    }
  }
  return total;
}

export async function listProfiles(tempBaseDir: string): Promise<ProfileInfo[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(tempBaseDir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const directories = entries.filter((entry) => entry.isDirectory());
  const [psLines, registry] = await Promise.all([getChromiumProcessArgs(), readRegistry()]);

  const results = await mapWithConcurrency(
    directories,
    SIZE_COMPUTE_CONCURRENCY,
    async (entry): Promise<ProfileInfo | undefined> => {
      const profilePath = path.join(tempBaseDir, entry.name);
      try {
        const stats = await fs.promises.stat(profilePath);
        const size = await computeDirectorySize(profilePath);
        return {
          id: entry.name,
          path: profilePath,
          size,
          createdAt: stats.birthtime,
          inUse: isProfileInUse(profilePath, psLines),
          autoCleanup: profilePath in registry,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          await reportError("Could not read profile directory", error, { silent: true });
        }
        return undefined;
      }
    },
  );

  const profiles = results.filter((profile): profile is ProfileInfo => profile !== undefined);
  profiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return profiles;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
