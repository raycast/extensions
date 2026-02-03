import { environment, getPreferenceValues } from "@raycast/api";

export const getPreferences = (): Preferences => getPreferenceValues<Preferences>();

/** True when running in development mode (ray dev) */
export const IS_DEV = environment.isDevelopment;

export const TIMEOUT_OPTIONS = [
  { value: "5", title: "5 seconds" },
  { value: "10", title: "10 seconds" },
  { value: "15", title: "15 seconds (default)" },
  { value: "30", title: "30 seconds" },
  { value: "45", title: "45 seconds" },
  { value: "60", title: "60 seconds" },
] as const;

export const MAX_RESULTS_OPTIONS = [
  { value: "50", title: "50 results" },
  { value: "100", title: "100 results (default)" },
  { value: "200", title: "200 results" },
  { value: "500", title: "500 results" },
] as const;

export const DEFAULT_MAX_RESULTS = 100;

export const GREP_BATCH_SIZE = 3;
export const MAX_HISTORY_ITEMS = 10;

/** Default directories to exclude from search (e.g., build artifacts, caches, version control) */
export const DEFAULT_EXCLUDED_DIRS: string[] = [
  "node_modules",
  ".git",
  ".DS_Store",
  "dist",
  "build",
  ".next",
  ".cache",
  "coverage",
  ".vscode",
  "Caches",
  "Logs",
  "Containers",
  "Cookies",
];

/** Default binary/non-text file extensions to exclude from search */
export const DEFAULT_EXCLUDED_EXTENSIONS: string[] = [
  // Images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "ico",
  "webp",
  "svg",
  "bmp",
  "tiff",
  // Documents
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  // Archives
  "zip",
  "gz",
  "tar",
  "rar",
  "7z",
  "bz2",
  "xz",
  // Fonts
  "woff",
  "woff2",
  "ttf",
  "eot",
  "otf",
  // Media
  "mp3",
  "mp4",
  "wav",
  "avi",
  "mov",
  "webm",
  "mkv",
  "flac",
  "ogg",
  // Binary/Executables
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "o",
  "a",
  // Database/Data
  "sqlite",
  "db",
  "lock",
  "pyc",
  "class",
  // Source maps
  "map",
];
