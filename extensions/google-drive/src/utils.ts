import { exec } from "child_process";
import util from "util";
import fs, { accessSync, existsSync, mkdirSync, PathLike, readdirSync, rm, rmSync, statSync } from "fs";
import { extname, join, resolve } from "path";
import { homedir } from "os";
import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Fzf } from "fzf";
import fg from "fast-glob";

import {
  DEFAULT_FILE_PREVIEW_IMAGE_PATH,
  DEFAULT_FOLDER_PREVIEW_IMAGE_PATH,
  FILE_SIZE_UNITS,
  IGNORED_GLOBS,
  MAX_TMP_FILE_PREVIEWS_LIMIT,
  NON_PREVIEWABLE_EXTENSIONS,
  TMP_FILE_PREVIEWS_PATH,
} from "./constants";
import { FileInfo, Preferences } from "./types";

export const log = (type: "debug" | "error", ...args: unknown[]) => {
  if (environment.isDevelopment) type === "error" ? console.error(...args) : console.log(...args);
};

export const fuzzyMatch = (source: string, target: string): number => {
  const result = new Fzf([target], { sort: false }).find(source);
  return result.length > 0 ? result[0].score : 0;
};

export const isEmpty = (text: string): boolean => text.trim().length === 0;
const execAsync = util.promisify(exec);
const isPathReadable = (path: PathLike): boolean => {
  try {
    accessSync(path, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
};
export const pathExists = (path: PathLike): boolean => isPathReadable(path) && existsSync(path);
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
    .filter((p) => p.length > 0)
    .map((p) => p.replace("~", homedir()));
};
export const formatBytes = (sizeInBytes: number): string => {
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

const filePreviewPath = async (file: FileInfo, controller: AbortController): Promise<null | string> => {
  mkdirSync(TMP_FILE_PREVIEWS_PATH, { recursive: true });

  if (!pathExists(TMP_FILE_PREVIEWS_PATH)) return null;

  if (NON_PREVIEWABLE_EXTENSIONS.includes(extname(file.path).toLowerCase())) {
    return null;
  }

  const filePreviewPath = join(TMP_FILE_PREVIEWS_PATH, `${file.name}.png`);

  if (!pathExists(filePreviewPath)) {
    try {
      await execAsync(`qlmanage -t -s 256 ${escapePath(file.path)} -o ${TMP_FILE_PREVIEWS_PATH}`, {
        signal: controller.signal,
        timeout: 2000 /* milliseconds */,
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

export const clearAllFilePreviewsCache = (shouldShowToast = true) => {
  if (pathExists(TMP_FILE_PREVIEWS_PATH)) {
    rmSync(TMP_FILE_PREVIEWS_PATH, { recursive: true, force: true });
  }

  shouldShowToast &&
    showToast({
      style: Toast.Style.Success,
      title: "File previews cache cleared!",
    });
};

const clearLeastAccessedFilePreviewsCache = (previewFiles: Array<string>) => {
  if (!pathExists(TMP_FILE_PREVIEWS_PATH)) return;

  const sortedFiles = previewFiles.sort((a, b) => {
    const aStats: fs.Stats = statSync(join(TMP_FILE_PREVIEWS_PATH, a));
    const bStats: fs.Stats = statSync(join(TMP_FILE_PREVIEWS_PATH, b));

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
    if (previewFiles.length > MAX_TMP_FILE_PREVIEWS_LIMIT) {
      clearLeastAccessedFilePreviewsCache(previewFiles);
    }
  }
};

export const filePreview = async (file: FileInfo | null, controller: AbortController): Promise<string> => {
  const previewImage = (path: string) => `<img src="file://${path}" width="192" height="192" />`;

  if (!file || !pathExists(file.path)) {
    return previewImage(DEFAULT_FILE_PREVIEW_IMAGE_PATH);
  }

  const previewPath = await filePreviewPath(file, controller);
  const previewExists = previewPath && existsSync(decodeURI(previewPath).replace("file://", ""));

  if (previewExists) {
    return previewImage(previewPath);
  } else {
    const iconPath = statSync(file.path).isDirectory()
      ? DEFAULT_FOLDER_PREVIEW_IMAGE_PATH
      : DEFAULT_FILE_PREVIEW_IMAGE_PATH;
    return previewImage(iconPath);
  }
};

type DriveFileStreamOptions = { stats?: boolean };
export const driveFileStream = ({ stats = false }: DriveFileStreamOptions = {}) => {
  const driveRootPath = getDriveRootPath();
  const preferences = getPreferenceValues<Preferences>();

  const excludePaths = getExcludePaths().concat(IGNORED_GLOBS);
  return fg.stream([join(driveRootPath, "**")], {
    ignore: excludePaths,
    dot: true,
    suppressErrors: true,
    objectMode: true,
    onlyFiles: !preferences.shouldShowDirectories,
    markDirectories: false,
    stats,
  });
};

export const throttledUpdateToastMessage = ({ toast, interval }: { toast: Toast; interval: number }) => {
  let lastUpdate = Date.now() - interval;

  return (message: string) => {
    if (lastUpdate + interval < Date.now()) {
      toast.message = message;
      lastUpdate = Date.now();
    }
  };
};
