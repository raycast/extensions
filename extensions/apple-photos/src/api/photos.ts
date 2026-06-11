import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { thumbnailPath, originalPath, idToFilename, thumbnailDir, originalsDir } from "../utils/cache";

const execFileAsync = promisify(execFile);
const CONVERTIBLE_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ".gif",
  ".bmp",
  ".webp",
]);

function isConvertibleImageFilename(filename: string): boolean {
  return CONVERTIBLE_IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function fetchPhotoMetadata(count = 24): Promise<{ id: string; filename: string; date: string }[]> {
  try {
    return await fetchMetadataFromDB(count);
  } catch {
    return await fetchMetadataFromAppleScript(count);
  }
}

async function fetchMetadataFromDB(count: number): Promise<{ id: string; filename: string; date: string }[]> {
  const dbPath = path.join(os.homedir(), "Pictures", "Photos Library.photoslibrary", "database", "Photos.sqlite");

  const query = `SELECT a.ZUUID, COALESCE(aa.ZORIGINALFILENAME, a.ZFILENAME), CAST(a.ZDATECREATED + 978307200 AS INTEGER) FROM ZASSET a LEFT JOIN ZADDITIONALASSETATTRIBUTES aa ON aa.Z_PK = a.ZADDITIONALATTRIBUTES WHERE a.ZTRASHEDSTATE = 0 AND a.ZHIDDEN = 0 AND a.ZLIBRARYSCOPETYPE = 0 ORDER BY a.ZDATECREATED DESC LIMIT ${count};`;

  const { stdout } = await execFileAsync("/usr/bin/sqlite3", ["-separator", "\t", dbPath, query]);

  if (!stdout.trim()) return [];

  return stdout
    .trim()
    .split("\n")
    .map((line) => {
      const [uuid, filename, unixTs] = line.split("\t");
      const date = new Date(parseInt(unixTs, 10) * 1000);
      return { id: `${uuid}/L0/001`, filename, date: date.toString() };
    })
    .filter((item) => isConvertibleImageFilename(item.filename))
    .reverse();
}

async function fetchMetadataFromAppleScript(count: number): Promise<{ id: string; filename: string; date: string }[]> {
  const result = await runAppleScript(`
    tell application "Photos"
      set allItems to media items
      set totalCount to count of allItems
      set startIndex to totalCount - ${count - 1}
      if startIndex < 1 then set startIndex to 1
      set theItems to items startIndex thru totalCount of allItems
      set output to ""
      repeat with i from 1 to count of theItems
        set theItem to item i of theItems
        set theId to id of theItem
        set theFilename to filename of theItem
        set theRawDate to date of theItem
        set theDate to (date string of theRawDate) & " " & (time string of theRawDate)
        if i > 1 then set output to output & "\n"
        set output to output & theId & "\t" & theFilename & "\t" & theDate
      end repeat
      return output
    end tell
  `);

  if (!result.trim()) return [];

  return result
    .trim()
    .split("\n")
    .map((line) => {
      const [id, filename, date] = line.split("\t");
      return { id, filename, date };
    })
    .filter((item) => isConvertibleImageFilename(item.filename));
}

export async function fetchMostRecentPhotoId(): Promise<string> {
  return runAppleScript(`
    tell application "Photos"
      return id of last media item
    end tell
  `);
}

async function exportPhoto(photoId: string, destDir: string): Promise<void> {
  await runAppleScript(`
    tell application "Photos"
      set theItem to media item id "${photoId}"
      export {theItem} to (POSIX file "${destDir}") with using originals
    end tell
  `);
}

async function sipsConvert(inputPath: string, outputPath: string, maxDimension?: number): Promise<void> {
  const args = ["-s", "format", "jpeg"];
  if (maxDimension) {
    args.push("-Z", String(maxDimension));
  }
  args.push(inputPath, "--out", outputPath);
  await execFileAsync("/usr/bin/sips", args);
}

async function exportAndConvert(
  photoId: string,
  destDir: string,
  outputPath: string,
  maxDimension?: number,
): Promise<void> {
  const safe = idToFilename(photoId);
  const tempDir = path.join(destDir, `tmp_${safe}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await exportPhoto(photoId, tempDir);

    const exported = fs.readdirSync(tempDir).sort();
    if (exported.length === 0) {
      throw new Error(`Export produced no files for photo ${photoId}`);
    }

    const sourceFilename = exported.find((filename) => isConvertibleImageFilename(filename));
    if (!sourceFilename) {
      throw new Error(`Export produced no convertible image files for photo ${photoId}`);
    }

    const srcPath = path.join(tempDir, sourceFilename);
    await sipsConvert(srcPath, outputPath, maxDimension);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function getOrExportThumbnail(photoId: string): Promise<string> {
  const cachePath = thumbnailPath(photoId);
  if (fs.existsSync(cachePath)) {
    return cachePath;
  }
  await exportAndConvert(photoId, thumbnailDir(), cachePath, 400);
  return cachePath;
}

export async function getOrExportOriginal(photoId: string): Promise<string> {
  const cachePath = originalPath(photoId);
  if (fs.existsSync(cachePath)) {
    return cachePath;
  }
  await exportAndConvert(photoId, originalsDir(), cachePath);
  return cachePath;
}

export async function openPhotoInPhotos(photoId: string): Promise<void> {
  await runAppleScript(`
    tell application "Photos"
      spotlight (media item id "${photoId}")
      activate
    end tell
  `);
}
