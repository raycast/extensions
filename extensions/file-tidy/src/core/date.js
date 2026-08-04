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
 * Resolve the year-month bucket for a file: EXIF capture time when available,
 * otherwise the earlier of birthtime/mtime (copies can reset birthtime forward).
 */
export async function resolveYearMonth(file) {
  if (EXIF_EXTS.has(file.ext)) {
    try {
      const exif = await exifr.parse(file.path, { pick: ["DateTimeOriginal", "CreateDate"] });
      const taken = exif?.DateTimeOriginal ?? exif?.CreateDate;
      if (taken instanceof Date && !Number.isNaN(taken.getTime()) && taken.getFullYear() > 1980) {
        return { yearMonth: format(taken), source: "exif" };
      }
    } catch {
      // Not a parsable image/video — fall through to filesystem dates.
    }
  }
  const fsDate = file.birthtime < file.mtime ? file.birthtime : file.mtime;
  return { yearMonth: format(fsDate), source: "fs" };
}

function format(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
