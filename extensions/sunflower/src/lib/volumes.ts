import { readdir, statfs } from "node:fs/promises";
import { join } from "node:path";

export interface VolumeUsage {
  name: string;
  path: string;
  total: number;
  free: number;
  used: number;
  fraction: number;
}

async function usage(
  name: string,
  path: string,
): Promise<VolumeUsage | undefined> {
  try {
    const info = await statfs(path);
    const total = info.blocks * info.bsize;
    const free = info.bavail * info.bsize;
    if (!total) return undefined;
    return {
      name,
      path,
      total,
      free,
      used: total - free,
      fraction: (total - free) / total,
    };
  } catch {
    return undefined;
  }
}

/** The startup disk plus every mounted volume under /Volumes (deduplicated by size). */
export async function listVolumes(): Promise<VolumeUsage[]> {
  const entries = await readdir("/Volumes").catch(() => [] as string[]);
  const results = await Promise.all([
    usage("Macintosh HD", "/"),
    ...entries
      .filter((name) => !name.startsWith("."))
      .map((name) => usage(name, join("/Volumes", name))),
  ]);
  const seen = new Set<string>();
  return results.filter((volume): volume is VolumeUsage => {
    if (!volume) return false;
    // /Volumes/Macintosh HD is a link to / — skip duplicates.
    const key = `${volume.total}:${volume.free}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value >= 100 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}
