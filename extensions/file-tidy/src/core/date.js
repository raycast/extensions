import exifr from "exifr";

const EXIF_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "heic",
  "heif",
  "tiff",
  "tif",
  "dng",
  "raw",
  "avif",
  "webp",
  "mp4",
  "mov",
]);

/**
 * Resolve the date bucket for a file: EXIF capture time when available,
 * otherwise the earlier of birthtime/mtime (copies can reset birthtime forward).
 *
 * granularity "month" -> "2026-07", "year" -> "2026", "none" -> "" (and skips
 * the EXIF read entirely, since nothing downstream needs the date).
 */
export async function resolveDateBucket(file, granularity = "month") {
  if (granularity === "none") return { bucket: "", source: "none" };
  if (EXIF_EXTS.has(file.ext)) {
    try {
      const exif = await exifr.parse(file.path, { pick: ["DateTimeOriginal", "CreateDate"] });
      const taken = exif?.DateTimeOriginal ?? exif?.CreateDate;
      if (taken instanceof Date && !Number.isNaN(taken.getTime()) && taken.getFullYear() > 1980) {
        return { bucket: format(taken, granularity), source: "exif" };
      }
    } catch {
      // Not a parsable image/video — fall through to filesystem dates.
    }
  }
  const fsDate = file.birthtime < file.mtime ? file.birthtime : file.mtime;
  return { bucket: format(fsDate, granularity), source: "fs" };
}

function format(date, granularity) {
  const year = String(date.getFullYear());
  return granularity === "year" ? year : `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
