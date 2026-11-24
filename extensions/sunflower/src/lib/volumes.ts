import { readdir, stat, statfs } from "node:fs/promises";
import { join } from "node:path";

export interface VolumeUsage {
  name: string;
  path: string;
  total: number;
  free: number;
  used: number;
  fraction: number;
  /** Filesystem identity (st_dev), used to drop aliases of the startup disk under /Volumes. */
  device: number;
}

async function usage(
  name: string,
  path: string,
): Promise<VolumeUsage | undefined> {
  try {
    const [info, identity] = await Promise.all([statfs(path), stat(path)]);
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
      device: identity.dev,
    };
  } catch {
    return undefined;
  }
}

/**
 * The startup disk plus every mounted volume under /Volumes (deduplicated by filesystem).
 * The startup disk takes its real name from the /Volumes entry that shares its filesystem.
 */
export async function listVolumes(): Promise<VolumeUsage[]> {
  const entries = await readdir("/Volumes").catch(() => [] as string[]);
  const [root, ...mounted] = await Promise.all([
    usage("Macintosh HD", "/"),
    ...entries
      .filter((name) => !name.startsWith("."))
      .map((name) => usage(name, join("/Volumes", name))),
  ]);
  const alias = root
    ? mounted.find((volume) => volume?.device === root.device)
    : undefined;
  const startup = root && alias ? { ...root, name: alias.name } : root;
  const seen = new Set<number>();
  return [startup, ...mounted].filter((volume): volume is VolumeUsage => {
    if (!volume) return false;
    // The startup disk's /Volumes entry links to / — skip duplicates.
    if (seen.has(volume.device)) return false;
    seen.add(volume.device);
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
