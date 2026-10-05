import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Only the four values actually used. The inode columns are counts, not
// sizes, and are easy to mistake for storage figures, so they're dropped.
export type VolumeUsage = {
  source: string;
  totalBytes: number;
  usedBytes: number;
  percentUsed: number;
  mountPoint: string;
};

// Both end columns can contain spaces, so the row is anchored on its
// numeric middle rather than split by column index.
const DF_ROW = /^(.+?)\s+(\d+)\s+(\d+)\s+\d+\s+(\d+)%\s+\d+\s+\d+\s+\S+\s+(.+)$/;

export function parseDfOutput(output: string): VolumeUsage[] {
  const rows: VolumeUsage[] = [];

  for (const rawLine of output.split("\n")) {
    const match = rawLine.trim().match(DF_ROW);
    if (!match) continue;

    const [, source, totalKb, usedKb, percentUsed, mountPoint] = match;
    rows.push({
      // df percent-escapes spaces in the filesystem column.
      source: decodeURI(source),
      // -k blocks are 1024 bytes, whatever the units the sizes are shown in.
      totalBytes: Number(totalKb) * 1024,
      usedBytes: Number(usedKb) * 1024,
      percentUsed: Number(percentUsed),
      mountPoint,
    });
  }

  return rows;
}

// Decimal units, because that is what Finder, Disk Utility and the label on
// the drive itself all use. Binary units would report an 8 TB disk as 7.3 TB.
const UNITS: [string, number][] = [
  ["PB", 1e15],
  ["TB", 1e12],
  ["GB", 1e9],
  ["MB", 1e6],
  ["KB", 1e3],
  ["B", 1],
];

function unitFor(bytes: number): [string, number] {
  return UNITS.find(([, size]) => bytes >= size) ?? UNITS[UNITS.length - 1];
}

// Fewer decimals as the number grows, so nothing reads as false precision.
function scaled(bytes: number): string {
  const [, size] = unitFor(bytes);
  const value = bytes / size;
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return String(parseFloat(value.toFixed(decimals)));
}

// "120 / 500 GB" when both land on the same unit, "369 GB / 7.94 TB" when they
// don't, which is what keeps a barely used drive from reading as empty.
// Undefined for anything that can't be stated honestly.
export function formatUsage(usedBytes: number, totalBytes: number): string | undefined {
  if (!Number.isFinite(usedBytes) || !Number.isFinite(totalBytes) || totalBytes <= 0) return undefined;

  const used = Math.max(usedBytes, 0);
  const [totalUnit] = unitFor(totalBytes);
  const [usedUnit] = used > 0 ? unitFor(used) : [totalUnit];

  return usedUnit === totalUnit
    ? `${scaled(used)} / ${scaled(totalBytes)} ${totalUnit}`
    : `${scaled(used)} ${usedUnit} / ${scaled(totalBytes)} ${totalUnit}`;
}

// Every mounted filesystem; shares are matched to a row by mount point.
export async function getAllVolumeUsage(): Promise<VolumeUsage[]> {
  try {
    const { stdout } = await execFileAsync("/bin/df", ["-k"]);
    return parseDfOutput(stdout);
  } catch {
    return [];
  }
}

export function usageForMountPoint(mountPoint: string, volumes: VolumeUsage[]): VolumeUsage | undefined {
  return volumes.find((volume) => volume.mountPoint === mountPoint);
}
