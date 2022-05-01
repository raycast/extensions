import { exec } from "child_process";
import util from "util";
import fs, { accessSync, existsSync, lstatSync, mkdirSync, PathLike, readdirSync, rm, rmSync, statSync } from "fs";
import { basename, extname, join, resolve } from "path";
import { homedir } from "os";
import { Database } from "sql.js";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

import {
  FILE_SIZE_UNITS,
  IGNORED_DIRECTORIES,
  MAX_TMP_FILE_PREVIEWS_LIMIT,
  NON_PREVIEWABLE_EXTENSIONS,
  TMP_FILE_PREVIEWS_PATH,
} from "./constants";
import { insertFile } from "./db";
import { FileInfo, Preferences } from "./types";
import { Fzf } from "fzf";

export const fuzzyMatch = (source: string, target: string): number => {
  const result = new Fzf([target], { sort: false }).find(source);
  return result.length > 0 ? result[0].score : 0;
};

const execAsync = util.promisify(exec);
const isPathReadable = (path: PathLike): boolean => {
  try {
    accessSync(path, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
};
const pathExists = (path: PathLike): boolean => isPathReadable(path) && existsSync(path);
const isDotUnderscore = (path: PathLike) => basename(path.toLocaleString()).startsWith("._");
const isDirectory = (path: PathLike) => !isDotUnderscore(path) && pathExists(path) && lstatSync(path).isDirectory();
const isFile = (path: PathLike) => !isDotUnderscore(path) && pathExists(path) && lstatSync(path).isFile();
export const displayPath = (path: PathLike): string => path.toLocaleString().replace(homedir(), "~");
export const escapePath = (path: PathLike): string => path.toLocaleString().replace(/([^0-9a-z_\-.~/])/gi, "\\$1");
export const getDriveRootPath = (): string => {
  const preferences = getPreferenceValues<Preferences>();

  return resolve(preferences.googleDriveRootPath.trim().replace("~", homedir()));
};
export const getExcludePaths = (): Array<string> => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.excludePaths
    .split(",")
    .map((p) => p.trim())
    .map((p) => p.replace("~", homedir()))
    .map((p) => resolve(p));
};
const formatBytes = (sizeInBytes: number): string => {
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

export const getDirectories = (path: PathLike): Array<PathLike> =>
  readdirSync(path, "utf8")
    .map((name) => join(path.toLocaleString(), name))
    .filter(isDirectory)
    .filter((dir) => !IGNORED_DIRECTORIES.includes(basename(dir)));

export const saveFilesInDirectory = (path: PathLike, db: Database) => {
  const preferences = getPreferenceValues<Preferences>();
  const excludePaths = getExcludePaths();
  readdirSync(path).forEach((file) => {
    const filePath = join(path.toLocaleString(), file);

    if (!preferences.shouldShowDirectories && !isFile(filePath)) return;
    if (excludePaths.includes(filePath)) return;

    const fileStats = statSync(filePath);

    insertFile(db, {
      name: basename(filePath),
      path: filePath,
      displayPath: displayPath(filePath),
      fileSizeFormatted: formatBytes(fileStats.size),
      createdAt: fileStats.birthtime,
      updatedAt: fileStats.mtime,
      favorite: false,
    });
  });
};

const filePreviewPath = async (file: FileInfo): Promise<null | string> => {
  mkdirSync(TMP_FILE_PREVIEWS_PATH, { recursive: true });

  if (!pathExists(TMP_FILE_PREVIEWS_PATH)) return null;

  if (NON_PREVIEWABLE_EXTENSIONS.includes(extname(file.path).toLowerCase())) {
    return null;
  }

  const filePreviewPath = join(TMP_FILE_PREVIEWS_PATH, `${file.name}.png`);

  if (!pathExists(filePreviewPath)) {
    try {
      await execAsync(`qlmanage -t -s 256 ${escapePath(file.path)} -o ${TMP_FILE_PREVIEWS_PATH}`, {
        timeout: 500 /* milliseconds */,
        killSignal: "SIGKILL",
      });
    } catch (e) {
      return null;
    }
  } else {
    // Mark the file as accessed
    const fileStats = statSync(filePreviewPath);
    fs.utimesSync(filePreviewPath, new Date(), fileStats.mtime);
  }

  return encodeURI(`file://${filePreviewPath}`);
};

export const clearAllFilePreviewsCache = () => {
  if (pathExists(TMP_FILE_PREVIEWS_PATH)) {
    rmSync(TMP_FILE_PREVIEWS_PATH, { recursive: true, force: true });
  }

  showToast({
    style: Toast.Style.Success,
    title: "File previews cache cleared!",
  });
};

const clearLeastAccessedFilePreviewsCache = (previewFiles: Array<string>) => {
  if (!pathExists(TMP_FILE_PREVIEWS_PATH)) return;

  const sortedFiles = previewFiles.sort((a, b) => {
    const aStats = statSync(join(TMP_FILE_PREVIEWS_PATH, a));
    const bStats = statSync(join(TMP_FILE_PREVIEWS_PATH, b));

    return aStats.atimeMs - bStats.atimeMs;
  });

  sortedFiles.slice(0, sortedFiles.length - MAX_TMP_FILE_PREVIEWS_LIMIT).forEach((file) => {
    rm(join(TMP_FILE_PREVIEWS_PATH, file), () => {
      /* NoOp */
    });
  });
};

export const initialSetup = () => {
  if (pathExists(TMP_FILE_PREVIEWS_PATH)) {
    const previewFiles = readdirSync(TMP_FILE_PREVIEWS_PATH, "utf8");
    // If TMP_FILE_PREVIEWS_PATH contains more than 50 files, clear it.
    if (previewFiles.length > MAX_TMP_FILE_PREVIEWS_LIMIT) {
      clearLeastAccessedFilePreviewsCache(previewFiles);
    }
  }
};

export const fileMetadataMarkdown = async (file: FileInfo | null): Promise<string> => {
  if (!file) {
    return "";
  }

  const previewPath = await filePreviewPath(file);
  const previewExists = previewPath && existsSync(decodeURI(previewPath).replace("file://", ""));
  const previewImage = previewExists ? `<img src="${previewPath}" alt="${file.name}" height="200" />` : "";

  return `
${previewImage}

## File Information
**Name**\n
${file.name}

---

**Path**\n
\`${file.displayPath}\`

---

**Size**\n
${file.fileSizeFormatted}

---

**Created**\n
${file.createdAt.toLocaleString()}

---

**Updated**\n
${file.updatedAt.toLocaleString()}`;
};
