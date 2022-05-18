import { exec } from "child_process";
import util from "util";
import fs, { accessSync, existsSync, mkdirSync, PathLike, readdirSync, rm, rmSync, statSync } from "fs";
import { extname, join, resolve } from "path";
import { homedir } from "os";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Fzf } from "fzf";
import fg from "fast-glob";

import {
  FILE_SIZE_UNITS,
  IGNORED_GLOBS,
  MAX_TMP_FILE_PREVIEWS_LIMIT,
  NON_PREVIEWABLE_EXTENSIONS,
  TMP_FILE_PREVIEWS_PATH,
} from "./constants";
import { FileInfo, Preferences } from "./types";

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
  if (!file) {
    return "";
  }

  const previewPath = await filePreviewPath(file, controller);
  const previewExists = previewPath && existsSync(decodeURI(previewPath).replace("file://", ""));
  const previewImage = previewExists
    ? `<img src="${previewPath}" alt="${file.name}" />`
    : `<img alt="${file.name}" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHg9IjBweCIgeT0iMHB4Igp3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIKdmlld0JveD0iMCAwIDgwIDgwIgpzdHlsZT0iIGZpbGw6IzAwMDAwMDsiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMy41IDc0LjVMMTMuNSAzLjUgNTAuNzkzIDMuNSA2OC41IDIxLjIwNyA2OC41IDc0LjV6Ij48L3BhdGg+PHBhdGggZmlsbD0iIzc4OGI5YyIgZD0iTTUwLjU4Niw0TDY4LDIxLjQxNFY3NEgxNFY0SDUwLjU4NiBNNTEsM0gxM3Y3Mmg1NlYyMUw1MSwzTDUxLDN6Ij48L3BhdGg+PGc+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTUwLjUgMjEuNUw1MC41IDMuNSA1MC43OTMgMy41IDY4LjUgMjEuMjA3IDY4LjUgMjEuNXoiPjwvcGF0aD48cGF0aCBmaWxsPSIjNzg4YjljIiBkPSJNNTEsNC40MTRMNjcuNTg2LDIxSDUxVjQuNDE0IE01MSwzaC0xdjE5aDE5di0xTDUxLDNMNTEsM3oiPjwvcGF0aD48L2c+PC9zdmc+"/>`;

  return previewImage;
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
