import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Only the four values actually used. The inode columns are counts, not
// sizes, and are easy to mistake for storage figures, so they're dropped.
export type VolumeUsage = {
  source: string;
  totalGb: number;
  usedGb: number;
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

    const [, source, totalGb, usedGb, percentUsed, mountPoint] = match;
    rows.push({
      // df percent-escapes spaces in the filesystem column.
      source: decodeURI(source),
      totalGb: Number(totalGb),
      usedGb: Number(usedGb),
      percentUsed: Number(percentUsed),
      mountPoint,
    });
  }

  return rows;
}

// Every mounted filesystem; shares are matched to a row by mount point.
export async function getAllVolumeUsage(): Promise<VolumeUsage[]> {
  try {
    const { stdout } = await execFileAsync("/bin/df", ["-g"]);
    return parseDfOutput(stdout);
  } catch {
    return [];
  }
}

export function usageForMountPoint(mountPoint: string, volumes: VolumeUsage[]): VolumeUsage | undefined {
  return volumes.find((volume) => volume.mountPoint === mountPoint);
}
