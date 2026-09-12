import { homedir } from "os";
import { join } from "path";

export const BUNDLE_ID = "app.spokenly";
export const PLIST_PATH = join(
  homedir(),
  "Library/Preferences/app.spokenly.plist",
);
export const APP_SUPPORT_DIR = join(
  homedir(),
  "Library/Application Support/Spokenly",
);
export const HISTORY_DIR = join(APP_SUPPORT_DIR, "History");
export const SPOKENLY_APP = "/Applications/Spokenly.app";
export const DEFAULT_MCP_PORT = 51089;

export const SUPPORTED_FILE_EXTENSIONS = [
  "mp3",
  "m4a",
  "wav",
  "flac",
  "mp4",
  "mov",
  "avi",
  "mkv",
] as const;

export type SupportedExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];
