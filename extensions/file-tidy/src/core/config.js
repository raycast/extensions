import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_PATH = resolveConfigPath();

/**
 * Windows: %APPDATA%\tidy\config.json; elsewhere: $XDG_CONFIG_HOME or
 * ~/.config (so the macOS path stays exactly where it always was).
 */
function resolveConfigPath() {
  const base =
    process.platform === "win32"
      ? (process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"))
      : (process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"));
  return path.join(base, "tidy", "config.json");
}

const DEFAULT_CONFIG = {
  // null = ask at runtime (Enter defaults to the current working directory)
  dest: null,
  categories: {
    Images: ["jpg", "jpeg", "png", "heic", "heif", "gif", "webp", "raw", "dng", "tiff", "tif", "bmp", "avif"],
    Videos: ["mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv", "flv"],
    Audios: ["mp3", "m4a", "wav", "flac", "aac", "ogg", "caf", "aiff", "wma"],
    Documents: [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "md",
      "txt",
      "rtf",
      "csv",
      "pages",
      "numbers",
      "key",
      "epub",
    ],
    Archives: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "dmg", "iso"],
  },
  fallbackCategory: "Others",
};

export function expandTilde(p) {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || (process.platform === "win32" && p.startsWith("~\\"))) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

/**
 * Canonicalize a path for containment checks: resolve symlinks (macOS's
 * /var → /private/var, case-insensitive spellings, …). For a path that
 * doesn't exist yet, canonicalize its deepest existing ancestor and
 * re-append the remainder.
 */
export function canonicalPath(p) {
  let dir = path.resolve(p);
  let rest = "";
  while (!fs.existsSync(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) return rest ? path.join(dir, rest) : dir;
    rest = rest ? path.join(path.basename(dir), rest) : path.basename(dir);
    dir = parent;
  }
  const real = fs.realpathSync(dir);
  return rest ? path.join(real, rest) : real;
}

/**
 * True when child is parent itself or nested anywhere under it.
 * path.relative handles case-insensitive drives/paths on Windows.
 * Callers should canonicalize both paths first (see canonicalPath).
 */
export function isInsideDir(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    return { ...structuredClone(DEFAULT_CONFIG), _created: true, _path: CONFIG_PATH };
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse config file (${CONFIG_PATH}): ${err.message}`);
  }
  const config = {
    ...structuredClone(DEFAULT_CONFIG),
    ...raw,
    _path: CONFIG_PATH,
  };
  if (raw.categories) config.categories = raw.categories;
  return config;
}

/** Build a lowercase extension -> category lookup table. */
export function buildExtIndex(config) {
  const index = new Map();
  for (const [category, exts] of Object.entries(config.categories)) {
    for (const ext of exts) index.set(ext.toLowerCase().replace(/^\./, ""), category);
  }
  return index;
}
