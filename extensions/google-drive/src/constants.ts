import { environment } from "@raycast/api";
import { homedir, tmpdir } from "os";
import path, { join } from "path";

export const IGNORED_DIRECTORIES = ["node_modules", "bower_components", ".git", "tmp"];
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
  ".DS_Store",
  ".app",
  ".gdoc",
  ".gsheet",
  ".gslides",
  ".gdraw",
];
export const MAX_RESULTS_WITHOUT_SEARCH_TEXT = 1000;
export const MAX_RESULTS_WITH_SEARCH_TEXT = 100;
export const MAX_TMP_FILE_PREVIEWS_LIMIT = 500; // Average size of a file preview is <20KB
export const DB_FILE_PATH = join(homedir(), ".raycast-google-drive-sqlite.db");
export const TMP_FILE_PREVIEWS_PATH = join(tmpdir(), "raycast-google-drive-file-previews");
export const FILES_LAST_INDEXED_AT_KEY = "filesLastIndexedAt";
export const FD_PATH = path.join(environment.supportPath, "fd");
export const FD_ARCHIVE_URL =
  "https://github.com/sharkdp/fd/releases/download/v8.3.2/fd-v8.3.2-x86_64-apple-darwin.tar.gz";

// Checksum generated using `shasum -a 256 archive.tar.gz`
export const FD_ARCHIVE_CHECKSUM = "02ce0825231fb370b0711e30933b043761beee46bdcbf0132eba43c3f510db53";
