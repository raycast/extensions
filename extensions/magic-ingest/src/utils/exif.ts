import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import { EXIF_DATE_TAGS } from "./constants";
import { ScannedFile } from "./scanner";

const execFileAsync = promisify(execFile);
const EXIFTOOL = "/opt/homebrew/bin/exiftool";

interface ExifResult {
  SourceFile: string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  MediaCreateDate?: string;
  FileModifyDate?: string;
  Rating?: number;
}

export async function checkExiftool(): Promise<boolean> {
  try {
    await execFileAsync(EXIFTOOL, ["-ver"]);
    return true;
  } catch {
    return false;
  }
}

function extractDate(exifDateStr: string): string | null {
  const match = exifDateStr.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getBestDate(result: ExifResult): string | null {
  for (const tag of EXIF_DATE_TAGS) {
    const value = result[tag];
    if (value && value !== "0000:00:00 00:00:00") {
      const date = extractDate(value);
      if (date) return date;
    }
  }
  return null;
}

export interface ExifMaps {
  dates: Map<string, string | null>;
  ratings: Map<string, number>;
}

/** Batch-read EXIF metadata (dates + rating). Chunks at 500 files per exiftool call. */
export async function batchReadExifMeta(
  filePaths: string[],
): Promise<ExifMaps> {
  const dates = new Map<string, string | null>();
  const ratings = new Map<string, number>();
  const BATCH_SIZE = 500;

  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    try {
      const { stdout } = await execFileAsync(
        EXIFTOOL,
        [
          "-DateTimeOriginal",
          "-CreateDate",
          "-MediaCreateDate",
          "-FileModifyDate",
          "-Rating",
          "-json",
          "-quiet",
          ...batch,
        ],
        { maxBuffer: 50 * 1024 * 1024 },
      );

      const results: ExifResult[] = JSON.parse(stdout);
      for (const result of results) {
        dates.set(result.SourceFile, getBestDate(result));
        ratings.set(result.SourceFile, result.Rating ?? 0);
      }
    } catch {
      for (const fp of batch) {
        dates.set(fp, null);
        ratings.set(fp, 0);
      }
    }
  }

  return { dates, ratings };
}

/**
 * Quick date scan using filesystem modification times. Cameras set mtime to
 * capture time, so this is accurate and nearly instant (~0.5s for 3000+ files)
 * compared to exiftool (~minutes for large RAW files like CR3).
 * Used by the form to populate the date picker before the full pipeline runs.
 */
export interface DateInfo {
  count: number;
  cardCount: number;
}

export async function scanDatesOnFiles(
  files: ScannedFile[],
): Promise<Map<string, DateInfo>> {
  const dateCounts = new Map<string, number>();
  const dateVolumes = new Map<string, Set<string>>();

  // Stat all files in parallel, batched to avoid fd exhaustion
  const BATCH_SIZE = 200;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const stats = await Promise.allSettled(
      batch.map((f) => stat(f.absolutePath)),
    );

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

export interface FilterResult {
  matched: ScannedFile[];
  totalScanned: number;
  afterDateFilter: number;
  afterStarFilter: number;
  orphanSidecars: string[];
}

/**
 * Filter files by date(s) and optionally by star rating. Handles sidecar pairing.
 * Uses fast filesystem mtime for date filtering. Only invokes exiftool when
 * star rating filtering is active (and only on the date-matched subset).
 * Sidecars follow their parent (matched by baseStem across all volumes).
 * @param targetDates array of YYYY-MM-DD strings to match
 * @param starRating null = off, 0 = unrated only, 1-5 = exact match
 */
export async function filterFiles(
  files: ScannedFile[],
  targetDates: string[],
  starRating: number | null,
): Promise<FilterResult> {
  const mediaFiles = files.filter((f) => !f.isSidecar);
  const sidecarFiles = files.filter((f) => f.isSidecar);

  // Fast date filtering via filesystem mtime
  const dateSet = new Set(targetDates);
  const fileDates = await batchStatDates(mediaFiles.map((f) => f.absolutePath));
  const dateMatched = mediaFiles.filter((f) => {
    const date = fileDates.get(f.absolutePath);
    return date !== undefined && dateSet.has(date);
  });
  const afterDateFilter = dateMatched.length;

  // Star rating: only call exiftool on date-matched files (much smaller set)
  let starMatched: ScannedFile[];
  if (starRating !== null && dateMatched.length > 0) {
    const ratings = await batchReadRatings(
      dateMatched.map((f) => f.absolutePath),
    );
    starMatched = dateMatched.filter((f) => {
      const rating = ratings.get(f.absolutePath) ?? 0;
      return rating === starRating;
    });
  } else {
    starMatched = dateMatched;
  }
  const afterStarFilter = starMatched.length;

  const matchedStems = new Set(starMatched.map((f) => f.baseStem));

  const matchedSidecars: ScannedFile[] = [];
  const orphanSidecars: string[] = [];

  for (const sidecar of sidecarFiles) {
    if (matchedStems.has(sidecar.baseStem)) {
      matchedSidecars.push(sidecar);
    } else {
      orphanSidecars.push(sidecar.absolutePath);
    }
  }

  return {
    matched: [...starMatched, ...matchedSidecars],
    totalScanned: files.length,
    afterDateFilter,
    afterStarFilter,
    orphanSidecars,
  };
}

/** Fast date lookup via filesystem mtime. Returns map of path → YYYY-MM-DD. */
async function batchStatDates(
  filePaths: string[],
): Promise<Map<string, string>> {
  const dates = new Map<string, string>();
  const BATCH_SIZE = 200;

  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const stats = await Promise.allSettled(batch.map((fp) => stat(fp)));
    for (let j = 0; j < batch.length; j++) {
      const result = stats[j];
      if (result.status === "fulfilled") {
        const mtime = result.value.mtime;
        const y = mtime.getFullYear();
        const m = String(mtime.getMonth() + 1).padStart(2, "0");
        const d = String(mtime.getDate()).padStart(2, "0");
        dates.set(batch[j], `${y}-${m}-${d}`);
      }
    }
  }

  return dates;
}

/** Read only Rating tag via exiftool. Used when star filtering is active. */
async function batchReadRatings(
  filePaths: string[],
): Promise<Map<string, number>> {
  const ratings = new Map<string, number>();
  const BATCH_SIZE = 500;

  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    try {
      const { stdout } = await execFileAsync(
        EXIFTOOL,
        ["-Rating", "-json", "-quiet", ...batch],
        { maxBuffer: 50 * 1024 * 1024 },
      );

      const results: Array<{ SourceFile: string; Rating?: number }> =
        JSON.parse(stdout);
      for (const result of results) {
        ratings.set(result.SourceFile, result.Rating ?? 0);
      }
    } catch {
      for (const fp of batch) {
        ratings.set(fp, 0);
      }
    }
  }

  return ratings;
}
