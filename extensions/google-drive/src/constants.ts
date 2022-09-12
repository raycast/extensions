import { environment } from "@raycast/api";
import { homedir, tmpdir } from "os";
import { join } from "path";

export const IGNORED_GLOBS = [
  "**/node_modules",
  "**/bower_components",
  "**/.git",
  "**/tmp",
  "**/.DS_Store",
  "**/.Trashes",
  "**/.VolumeIcon.icns",
  "**/.TemporaryItems",
  "**/.shortcut-targets-by-id",
  "**/.file-revisions-by-id",
];
export const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];
export const NON_PREVIEWABLE_EXTENSIONS = [
  "",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".xz",
  ".iso",
  ".dmg",
  ".exe",
  ".app",
  ".gdoc",
  ".gsheet",
  ".gslides",
  ".gdraw",
  ".sketch",
];
export const MAX_RESULTS_WITHOUT_SEARCH_TEXT = 1000;
export const MAX_RESULTS_WITH_SEARCH_TEXT = 100;
export const MAX_TMP_FILE_PREVIEWS_LIMIT = 500; // Average size of a file preview is <20KB
export const DEFAULT_FILE_PREVIEW_IMAGE_PATH = join(environment.assetsPath, "file.png");
export const DEFAULT_FOLDER_PREVIEW_IMAGE_PATH = join(environment.assetsPath, "folder.png");
export const SPINNER_GIF_PATH = join(environment.assetsPath, "loading-spinner.gif");
export const DB_FILE_PATH = join(homedir(), ".raycast-google-drive-sqlite.db");
export const TMP_FILE_PREVIEWS_PATH = join(tmpdir(), "raycast-google-drive-file-previews");
export const FILES_LAST_INDEXED_AT_KEY = "filesLastIndexedAt";
export const TOAST_UPDATE_INTERVAL = 100;
