import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import { ScannedFile } from "./scanner";

const execFileAsync = promisify(execFile);

/** Apple Silicon Homebrew, Intel Homebrew, then PATH. */
const EXIFTOOL_CANDIDATES = ["/opt/homebrew/bin/exiftool", "/usr/local/bin/exiftool", "exiftool"];

async function resolveExiftoolPath(): Promise<string | null> {
  for (const candidate of EXIFTOOL_CANDIDATES) {
    try {
      if (candidate !== "exiftool") {
        await stat(candidate);
      }
      await execFileAsync(candidate, ["-ver"]);
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

export async function checkExiftool(): Promise<boolean> {
  return (await resolveExiftoolPath()) !== null;
}

export interface DateInfo {
  count: number;
  cardCount: number;
}

/**
 * Quick date scan using filesystem modification times. Cameras set mtime to
 * capture time, so this is accurate and nearly instant (~0.5s for 3000+ files)
 * compared to exiftool (~minutes for large RAW files like CR3).
 * Used by the form to populate the date picker before the full pipeline runs.
 */
export async function scanDatesOnFiles(files: ScannedFile[]): Promise<Map<string, DateInfo>> {
  const dateCounts = new Map<string, number>();
  const dateVolumes = new Map<string, Set<string>>();

  // Stat all files in parallel, batched to avoid fd exhaustion
  const BATCH_SIZE = 200;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const stats = await Promise.allSettled(batch.map((f) => stat(f.absolutePath)));

    for (let j = 0; j < stats.length; j++) {
      const result = stats[j];
      if (result.status === "fulfilled") {
        const mtime = result.value.mtime;
        const y = mtime.getFullYear();
        const m = String(mtime.getMonth() + 1).padStart(2, "0");
        const d = String(mtime.getDate()).padStart(2, "0");
        const date = `${y}-${m}-${d}`;
        dateCounts.set(date, (dateCounts.get(date) ?? 0) + 1);

        const vols = dateVolumes.get(date) ?? new Set<string>();
        vols.add(batch[j].volumePath);
        dateVolumes.set(date, vols);
      }
    }
  }

  const result = new Map<string, DateInfo>();
  for (const [date, count] of dateCounts) {
    result.set(date, {
      count,
      cardCount: dateVolumes.get(date)?.size ?? 1,
    });
  }
  return result;
}
