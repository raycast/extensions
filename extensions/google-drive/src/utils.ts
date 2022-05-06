import { exec, execSync } from "child_process";
import util from "util";
import fs, {
  accessSync,
  chmodSync,
  existsSync,
  mkdirSync,
  PathLike,
  readdirSync,
  readFileSync,
  rm,
  rmSync,
  statSync,
} from "fs";
import path, { basename, dirname, extname, join, resolve } from "path";
import { homedir, tmpdir } from "os";
import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Fzf } from "fzf";
import download from "download";
import tar from "tar";

import {
  FD_ARCHIVE_CHECKSUM,
  FD_ARCHIVE_URL,
  FD_PATH,
  FILE_SIZE_UNITS,
  IGNORED_DIRECTORIES,
  MAX_TMP_FILE_PREVIEWS_LIMIT,
  NON_PREVIEWABLE_EXTENSIONS,
  TMP_FILE_PREVIEWS_PATH,
} from "./constants";
import { FileInfo, Preferences } from "./types";
import { createHash } from "crypto";

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
const pathExists = (path: PathLike): boolean => isPathReadable(path) && existsSync(path);
export const isDotUnderscore = (path: PathLike) => basename(path.toLocaleString()).startsWith("._");
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
    .map((p) => p.replace("~", homedir()).replace(`${getDriveRootPath()}/`, ""))
    .map((p) => resolve(p));
};
export const formatBytes = (sizeInBytes: number): string => {
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
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

export const initialSetup = async () => {
  await ensureFdExecutableExists();

  if (pathExists(TMP_FILE_PREVIEWS_PATH)) {
    const previewFiles = readdirSync(TMP_FILE_PREVIEWS_PATH, "utf8");
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
${new Date(file.createdAt).toLocaleString()}

---

**Updated**\n
${new Date(file.updatedAt).toLocaleString()}`;
};

const checksumFile = (filePath: PathLike): string => {
  const fileContents = readFileSync(filePath);
  return createHash("sha256").update(fileContents).digest("hex");
};

export const ensureFdExecutableExists = async () => {
  if (fs.existsSync(FD_PATH)) return;

  const tmpDir = join(tmpdir(), "fd");
  mkdirSync(tmpDir, { recursive: true });

  if (!fs.existsSync(tmpDir)) {
    throw new Error(`Could not create a tmp directory "${tmpDir}" to download and extract fd`);
  }

  try {
    await download(FD_ARCHIVE_URL, tmpDir, { filename: "fd.tar.gz" });
  } catch (e) {
    console.error(e);
    throw Error("Could not download the required fd binary archive");
  }

  const archive = path.join(tmpDir, "fd.tar.gz");

  // verify checksum of the archive
  const checksum = checksumFile(archive);
  if (checksum !== FD_ARCHIVE_CHECKSUM) {
    if (pathExists(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });

    throw Error("Checksum of the downloaded gd archive does not match");
  }

  try {
    await tar.extract({
      file: archive,
      strip: 1,

      filter: (p) => basename(p) === "fd",
      cwd: dirname(FD_PATH),
    });
  } catch (e) {
    console.error(e);
    throw new Error("Could not extract tgz content of fd archive");
  } finally {
    if (pathExists(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }

  if (fs.existsSync(FD_PATH)) {
    chmodSync(FD_PATH, "755");
    if (environment.isDevelopment) {
      console.log("fd executable path:", FD_PATH);
      console.log(execSync("fd --version").toString());
    }
  }
};

export const listFilesCommand = (includeStats = false): string => {
  const preferences = getPreferenceValues<Preferences>();
  const driveRootPath = getDriveRootPath();

  let fileTypeOption = "";
  if (!preferences.shouldShowDirectories) {
    fileTypeOption = "--type file";
  }

  const excludPaths = getExcludePaths().concat(IGNORED_DIRECTORIES);
  const excludePathsOptions = excludPaths.map((path) => `--exclude ${escapePath(path)}`);
  const execOption = includeStats ? `-x stat -L -f "%SB | %Sm | %z | %N"` : "";
  const command = `${escapePath(FD_PATH)} -L -H ${fileTypeOption} ${excludePathsOptions.join(" ")} . ${escapePath(
    driveRootPath
  )} ${execOption}`;

  if (environment.isDevelopment) console.log(`listFilesCommand(includeStats: ${includeStats}):`, command);

  return command;
};

export const getTotalFileCount = (): number => {
  if (!pathExists(getDriveRootPath())) return 0;

  const command = `${listFilesCommand(false)} | wc -l`;
  const output = execSync(command);
  return parseInt(output.toString(), 10);
};
