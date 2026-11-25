import { execFile } from "node:child_process";
import { statfs } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DiskSpace = { freeBytes: number; totalBytes: number };

/** Free and total space of the startup disk. Uses statfs, falls back to `df -k /`. */
export async function getStartupDiskSpace(): Promise<DiskSpace> {
  try {
    const stats = await statfs("/");
    return { freeBytes: stats.bavail * stats.bsize, totalBytes: stats.blocks * stats.bsize };
  } catch {
    const { stdout } = await execFileAsync("/bin/df", ["-k", "/"]);
    const fields = stdout.trim().split("\n")[1].trim().split(/\s+/);
    // Filesystem 1024-blocks Used Available Capacity ...
    return { totalBytes: Number(fields[1]) * 1024, freeBytes: Number(fields[3]) * 1024 };
  }
}

/** Decimal units, like Finder: 198.3 GB. */
export function formatBytes(bytes: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return unit === 0 ? `${value} bytes` : `${value.toFixed(1)} ${units[unit]}`;
}

export function describeSpace({ freeBytes, totalBytes }: DiskSpace): string {
  return `${formatBytes(freeBytes)} free of ${formatBytes(totalBytes)}`;
}
