import { formatBytes } from "./format";

/** A mounted volume as `assets/mounted-volumes.js` reports it. */
export interface Volume {
  /** Where the volume is mounted, such as `/` or `/Volumes/Backup`. */
  path: string;
  /** The name Finder shows, such as Macintosh HD. */
  name: string;
  totalCapacity: number;
  /**
   * Bytes free for new files, counting purgeable files macOS can remove on its own, which is the
   * number Finder and Sizewise show. `null` when the volume reports no available space.
   */
  availableCapacity: number | null;
  isStartupDisk: boolean;
}

/**
 * Reads the script's output, keeping only well-formed volumes, startup disk first, then by name
 * in Finder's order, as Sizewise lists them.
 */
export function parseVolumes(json: string): Volume[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("The volume list isn't an array.");
  return parsed.filter(isVolume).sort((first, second) => {
    if (first.isStartupDisk !== second.isStartupDisk) return first.isStartupDisk ? -1 : 1;
    return first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" });
  });
}

function isVolume(value: unknown): value is Volume {
  if (typeof value !== "object" || value === null) return false;
  const volume = value as Record<string, unknown>;
  return (
    typeof volume.path === "string" &&
    volume.path.startsWith("/") &&
    typeof volume.name === "string" &&
    typeof volume.totalCapacity === "number" &&
    (volume.availableCapacity === null || typeof volume.availableCapacity === "number") &&
    typeof volume.isStartupDisk === "boolean"
  );
}

/** "212.35 GB of 1 TB available", or only the size when the volume doesn't report what's available. */
export function availableSpaceSummary(volume: Volume): string {
  const total = formatBytes(volume.totalCapacity);
  if (volume.availableCapacity === null) return total;
  return `${formatBytes(volume.availableCapacity)} of ${total} available`;
}

/** The share of the volume in use, from 0 to 1, or `undefined` when its available space is unknown. */
export function usedFraction(volume: Volume): number | undefined {
  if (volume.availableCapacity === null || volume.totalCapacity <= 0) return undefined;
  return Math.min(Math.max(1 - volume.availableCapacity / volume.totalCapacity, 0), 1);
}

/** A volume as the AI tool reports it, with sizes in the words Sizewise and Finder use. */
export interface DiskSpace {
  name: string;
  path: string;
  isStartupDisk: boolean;
  size: string;
  available?: string;
  percentUsed?: number;
}

export function diskSpace(volume: Volume): DiskSpace {
  const used = usedFraction(volume);
  return {
    name: volume.name,
    path: volume.path,
    isStartupDisk: volume.isStartupDisk,
    size: formatBytes(volume.totalCapacity),
    available: volume.availableCapacity === null ? undefined : formatBytes(volume.availableCapacity),
    percentUsed: used === undefined ? undefined : Math.round(used * 100),
  };
}
