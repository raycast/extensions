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

export interface Preferences {
  musicDir: string;
}

export const DEFAULT_MUSIC_DIR = `${homedir()}/Music`;

/**
 * Retrieves the music directory path.
 * If the music directory is not set in the preferences, the default music directory is used.
 * If the music directory starts with "~", it is replaced with the user's home directory.
 *
 * @returns The resolved music directory path.
 */
export function getMusicDir() {
  let { musicDir = DEFAULT_MUSIC_DIR } = getPreferenceValues<Preferences>();
  if (musicDir.startsWith("~")) {
    musicDir = musicDir.replace("~", homedir());
  }

  return resolve(musicDir);
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
    const fileData = lstatSync(`${path}/${file}`);

    let fileType: FileType = "other";
    if (fileData.isDirectory()) fileType = "directory";
    if (fileData.isFile() && mime.getType(file)?.startsWith("audio")) fileType = "audio";
    if (fileType === "other") continue;

    const size = fileData.size;

    const d: FileDataType = {
      id: fileData.ino,
      isDir: fileType === "directory",
      name: file,
      size,
      path,
    };

    data.push(d);
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

function formatDateTime(date: Date) {
  return format(date, "dd MMM yyyy, HH:mm:ss", { locale: enUS });
}
