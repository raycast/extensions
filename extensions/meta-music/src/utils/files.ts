import { getPreferenceValues } from "@raycast/api";

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { filesize } from "filesize";
import mime from "mime";
import { lstatSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export type FileType = "directory" | "audio" | "other";

export interface FileDataType {
  id: number;
  isDir: boolean;
  name: string;
  size: number;
  path: string;
}

export interface FileGeneralMetadata {
  size: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_MUSIC_DIR = `${homedir()}/Music`;

/**
 * Retrieves user preferences for the music directory and Finder selection usage.
 *
 * - If the music directory is not set in preferences, the default music directory (`~/Music`) is used.
 * - If the music directory path starts with `"~"`, it is expanded to the user's home directory.
 * - The returned `musicDir` is an absolute, resolved path.
 *
 * @returns An object containing:
 *   - `musicDir`: The resolved absolute path to the music directory.
 *   - `useFinderSelection`: Boolean indicating whether to use Finder selection on launch.
 */
export function getPreferences() {
  const { musicDir = DEFAULT_MUSIC_DIR, useFinderSelection } = getPreferenceValues<Preferences>();
  let dir = musicDir;
  if (dir.startsWith("~")) {
    dir = dir.replace("~", homedir());
  }

  return { musicDir: resolve(dir), useFinderSelection };
}

/**
 * Retrieves directory data for the given path.
 * @param path - The path to the directory.
 * @returns An array of FileDataType objects representing the directory data.
 */
export function getDirData(path: string) {
  const files = readdirSync(path);

  const data: FileDataType[] = [];

  for (const file of files) {
    if (file.startsWith(".")) continue;
    if (file.endsWith(".DS_Store")) continue;
    if (file.endsWith(".musiclibrary")) continue;

    const fileData = lstatSync(`${path}/${file}`);

    let fileType: FileType = "other";
    if (fileData.isDirectory()) fileType = "directory";

    if (fileData.isFile() && mime.getType(file)?.startsWith("audio")) fileType = "audio";
    if (fileType === "other") continue;

    const size = fileData.size;

    const element: FileDataType = {
      id: fileData.ino,
      isDir: fileType === "directory",
      name: file,
      size,
      path,
    };

    data.push(element);
  }

  const sortedData = data.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  return sortedData;
}

/**
 * Retrieves the parent directory of a given path.
 * @param path - The path for which to retrieve the parent directory.
 * @returns The parent directory of the given path.
 */
export function getParentDir(path: string) {
  const pathArray = path.split("/");
  pathArray.pop();
  return pathArray.join("/");
}

/**
 * Retrieves the file name from a given path.
 * @param path - The path to the file.
 * @returns The file name.
 */
export function getFileNameFromPath(path: string) {
  const pathArray = path.split("/");
  return pathArray.pop() || "";
}

/**
 * Retrieves general metadata for a file.
 * @param path - The path of the file.
 * @returns An object containing the size, creation date, and last modified date of the file.
 */
export function getFileGeneralMetadata(path: string) {
  const fileData = lstatSync(path);

  return {
    size: filesize(fileData.size),
    createdAt: formatDateTime(fileData.birthtime),
    updatedAt: formatDateTime(fileData.mtime),
  };
}

/**
 * Formats a Date object into a human-readable string.
 * @param date - The Date object to format.
 * @returns A formatted date string in the format "dd MMM yyyy, HH:mm:ss".
 */
function formatDateTime(date: Date) {
  return format(date, "dd MMM yyyy, HH:mm:ss", { locale: enUS });
}

/**
 * Normalizes a file name by removing the ".localized" suffix.
 * @param fileName - The file name to normalize.
 * @returns The normalized file name.
 */
export function normalizeFileName(fileName: string) {
  return fileName.replace(".localized", "");
}

/**
 * Normalizes a path segments by removing the ".localized" suffix from each segment.
 * @param path - The path to normalize.
 * @returns The normalized path.
 */
export function normalizePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => normalizeFileName(segment))
    .join("/");
}
