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
      "mobi",
      "azw3",
      "azw",
    ],
    Archives: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "dmg", "iso"],
    Fonts: ["ttf", "otf", "ttc", "woff", "woff2", "eot"],
  },
  fallbackCategory: "Others",

  // Prefix on every folder tidy creates ("ft_" = file-tidy), so its output is
  // visually distinct from folders the user made by hand. "" = old naming.
  folderPrefix: "ft_",

  /**
   * Date bucket depth per category: "month" | "year" | "none".
   * Photos and videos carry a real capture date, so year-month is meaningful.
   * Fonts, installers and ebooks only carry a download date — bucketing those
   * by month scatters one logical set across a dozen folders for no reason.
   */
  granularity: {
    Images: "month",
    Videos: "month",
    Documents: "year",
    Audios: "none",
    Archives: "none",
    Fonts: "none",
    Others: "none",
  },

  /**
   * Optional second level inside a category, matched top-down on the file name
   * (and extension). First rule that matches wins; no match = no subfolder.
   * `match` entries are case-insensitive regex sources; `exts` are extensions.
   */
  subCategories: {
    Images: [
      {
        name: "Screenshots",
        match: ["screen ?shot", "screen ?capture", "截屏", "屏幕快照", "屏幕截图", "snipaste", "cleanshot"],
      },
      { name: "Screencasts", match: ["screen ?record", "screencast", "录屏", "屏幕录制"] },
      { name: "Wallpapers", match: ["wallpaper", "壁纸"] },
    ],
    Videos: [{ name: "Screencasts", match: ["screen ?record", "screencast", "录屏", "屏幕录制"] }],
    Documents: [
      { name: "Ebooks", exts: ["epub", "mobi", "azw3", "azw"] },
      { name: "Invoices", match: ["invoice", "receipt", "发票", "账单", "回执"] },
      { name: "Contracts", match: ["contract", "agreement", "\\bnda\\b", "合同", "协议", "授权书"] },
      { name: "Resumes", match: ["resume", "\\bcv\\b", "简历"] },
      { name: "Papers", match: ["thesis", "dissertation", "论文", "开题", "文献"] },
      { name: "Spreadsheets", exts: ["xls", "xlsx", "csv", "numbers"] },
      { name: "Slides", exts: ["ppt", "pptx", "key"] },
    ],
    Archives: [{ name: "Installers", exts: ["dmg", "pkg", "exe", "msi", "iso", "apk", "deb", "rpm"] }],
  },

  /** Extra passes beyond byte-level dedup. All are advisory unless noted. */
  detect: {
    /** Same-content-different-encoding candidates: normalized names, same stem
     *  across formats, version-numbered releases. Flagged in the plan only. */
    similar: true,
    /** Zero-byte files, extension/magic-number mismatches, OS junk.
     *  Junk and broken files are moved to the review folder. */
    health: true,
    /** Visually near-identical images (bursts, re-exports, re-compressions).
     *  Flagged in the plan only. Needs image decoding — see phash.js. */
    perceptual: true,
  },

  /** Hamming distance under which two image hashes count as near-identical. */
  perceptualThreshold: 5,
};

/** Folders tidy creates itself (before the prefix is applied). */
export const DUPLICATES_DIR = "Duplicates";
export const REVIEW_DIR = "Review";
/** Bookkeeping folder: run manifests and the perceptual-hash cache. */
export const TIDY_DIR = ".tidy";

/**
 * Base names introduced together with (or after) the folder prefix — 0.4.0
 * never created an un-prefixed folder of these names, so an existing one in
 * destDir is the user's own and must never be adopted as tidy territory.
 */
const POST_PREFIX_BASES = new Set([REVIEW_DIR, "Fonts"]);

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
    // code + configPath let adapters render this in their own language.
    const e = new Error(`Failed to parse config file (${CONFIG_PATH}): ${err.message}`, { cause: err });
    e.code = "CONFIG_PARSE";
    e.configPath = CONFIG_PATH;
    throw e;
  }
  // JSON.parse happily returns a scalar, and a hand-emptied config file often
  // holds exactly `null` — which would die on the first property read below.
  // Anything that isn't an object carries no settings, so fall back to the
  // defaults rather than making an unusable config fatal.
  const settings = isPlainObject(raw) ? raw : {};
  const config = {
    ...structuredClone(DEFAULT_CONFIG),
    ...settings,
    _path: CONFIG_PATH,
  };
  // Whole-map settings: a user-supplied value replaces the default outright,
  // so removing a category/rule in the config actually removes it. Only a real
  // object may replace one — a hand-edited scalar would otherwise wipe every
  // default and get iterated character by character downstream.
  if (isPlainObject(settings.categories)) config.categories = settings.categories;
  if (isPlainObject(settings.subCategories)) config.subCategories = settings.subCategories;
  // Keyed switches: merge, so writing one key doesn't silently reset the rest.
  // `detect: false` is the everything-off shorthand and passes through as-is.
  config.granularity = { ...DEFAULT_CONFIG.granularity, ...pick(settings.granularity) };
  config.detect = settings.detect === false ? false : { ...DEFAULT_CONFIG.detect, ...pick(settings.detect) };
  // Because categories replace rather than merge, a config written by an older
  // version silently misses categories added since. Report the gap so adapters
  // can point it out instead of quietly filing those files under Others — but
  // never patch it in: an absent category may well be a deliberate deletion.
  config._staleCategories = isPlainObject(settings.categories)
    ? Object.keys(DEFAULT_CONFIG.categories).filter((c) => !(c in settings.categories))
    : [];
  return config;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The value if it can be merged over a defaults object, otherwise nothing. */
function pick(value) {
  return isPlainObject(value) ? value : null;
}

/**
 * Name folders as `${folderPrefix}${base}` — but if an un-prefixed folder of
 * that name already exists in destDir (and the prefixed one doesn't), keep
 * using it. That way turning the prefix on doesn't split an existing archive
 * into two parallel trees; only fresh destinations get the prefix.
 * Adoption is limited to names 0.4.0 could actually have created: a name from
 * POST_PREFIX_BASES that exists un-prefixed can only be the user's own folder.
 * Returns a memoized (base) => actualName function.
 */
export function buildFolderNamer(destDir, config) {
  const prefix = config.folderPrefix ?? "";
  const cache = new Map();
  return function folderName(base) {
    const hit = cache.get(base);
    if (hit !== undefined) return hit;
    let name = prefix ? prefix + base : base;
    if (
      prefix &&
      !POST_PREFIX_BASES.has(base) &&
      isDir(path.join(destDir, base)) &&
      !fs.existsSync(path.join(destDir, name))
    ) {
      name = base;
    }
    cache.set(base, name);
    return name;
  };
}

/**
 * A path inside destDir's bookkeeping folder, refused if anything along the way
 * is a symlink leading out of destDir. Manifests and the hash cache are written
 * and read through here, and undo acts on whatever a manifest says, so a
 * redirected `.tidy` (or `.tidy/runs`) turns "records for this destination"
 * into "records someone else planted".
 *
 * Every segment must be checked, not just the first: `.tidy` can be a genuine
 * directory while `runs` inside it is the link. Callers must route through this
 * rather than joining ".tidy" onto destDir themselves.
 */
export function tidyPath(destDir, ...sub) {
  const target = path.join(destDir, TIDY_DIR, ...sub);
  // No existsSync guard: canonicalPath resolves the deepest existing ancestor,
  // so a not-yet-created runs folder is still judged by whether the `.tidy`
  // above it is a link out of destDir.
  if (!isInsideDir(canonicalPath(destDir), canonicalPath(target))) {
    // code + destDir let adapters render this in their own language.
    const e = new Error(`${TIDY_DIR} in ${destDir} resolves outside it`);
    e.code = "TIDY_DIR_ESCAPES";
    e.destDir = destDir;
    throw e;
  }
  return target;
}

/** existsSync alone would also match a plain file, whose adoption later dies in mkdir with ENOTDIR. */
function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Every folder name tidy may own in destDir, in every spelling it may carry on
 * disk: current prefix, the default prefix (in case the user changed prefixes
 * between runs), and — for names that predate the prefix — un-prefixed. Used
 * so in-place mode excludes them from the source scan and cross-run dedup can
 * find them however they were named.
 */
export function organizedDirNames(config) {
  const prefix = config.folderPrefix ?? "";
  const bases = [...Object.keys(config.categories), config.fallbackCategory, DUPLICATES_DIR, REVIEW_DIR];
  const names = new Set();
  for (const b of bases) {
    if (!prefix || !POST_PREFIX_BASES.has(b)) names.add(b);
    names.add(prefix + b);
    names.add(DEFAULT_CONFIG.folderPrefix + b);
  }
  return names;
}

/**
 * Every spelling the quarantine folders may carry on disk. Rejected copies in
 * them must never re-enter a scan (as dedup keepers or archived content), no
 * matter which prefix was configured when they were created. Prefixes other
 * than the current and default ones aren't tracked — changing to a custom
 * prefix and back is on the user.
 */
export function quarantineDirNames(config) {
  const prefix = config.folderPrefix ?? "";
  const names = new Set();
  for (const b of [DUPLICATES_DIR, REVIEW_DIR]) {
    names.add(b);
    names.add(prefix + b);
    names.add(DEFAULT_CONFIG.folderPrefix + b);
  }
  return names;
}

/** Build a lowercase extension -> category lookup table. */
export function buildExtIndex(config) {
  const index = new Map();
  for (const [category, exts] of Object.entries(config.categories)) {
    // A hand-edited category holding a bare string would otherwise be iterated
    // one character at a time, quietly filling the index with junk extensions.
    if (!Array.isArray(exts)) continue;
    for (const ext of exts) index.set(String(ext).toLowerCase().replace(/^\./, ""), category);
  }
  return index;
}
