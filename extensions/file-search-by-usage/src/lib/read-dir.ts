import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Entry } from "./types";

/** Maximum entries returned for one directory listing. */
export const MAX_ENTRIES = 3000;

export function displayPath(p: string): string {
  const home = os.homedir();
  return p === home
    ? "~"
    : p.startsWith(home + path.sep)
      ? "~" + p.slice(home.length)
      : p;
}

/** Path segments excluded from recursive search. */
export const NOISE_SEGMENTS = new Set([
  "node_modules",
  "site-packages",
  "__pycache__",
  "Caches",
  "DerivedData",
]);

/** Library branches that contain user files or cloud storage. */
const LIBRARY_DOCUMENT_DIRS = new Set(["CloudStorage", "Mobile Documents"]);

function isOutsideRoot(relative: string): boolean {
  return relative === ".." || relative.startsWith(`..${path.sep}`);
}

/** Checks enclosing segments for recursive-search exclusions. */
export function isNoisyPath(
  full: string,
  root: string,
  showHidden: boolean,
): boolean {
  const rel = path.relative(root, full);
  if (rel === "" || isOutsideRoot(rel)) return false;

  const segments = rel.split(path.sep);
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (segment === "Library") {
      // Preserve Library branches that contain user files.
      if (LIBRARY_DOCUMENT_DIRS.has(segments[i + 1] ?? "")) continue;
      return true;
    }
    if (NOISE_SEGMENTS.has(segment)) return true;
    if (!showHidden && segment.startsWith(".")) return true;
  }
  return false;
}

/** How many directory levels `full` sits below `root`. Direct child = 0. */
export function relativeDepth(root: string, full: string): number {
  const rel = path.relative(root, full);
  if (rel === "" || isOutsideRoot(rel)) return 0;
  return rel.split(path.sep).length - 1;
}

export type ReadResult = {
  entries: Entry[];
  truncated: number;
  error?: string;
};

/** Reads and stats direct children, bounded by MAX_ENTRIES. */
export function readDirectory(dir: string, showHidden: boolean): ReadResult {
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return {
      entries: [],
      truncated: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const visible = showHidden
    ? dirents
    : dirents.filter((d) => !d.name.startsWith("."));
  const truncated = Math.max(0, visible.length - MAX_ENTRIES);
  const entries: Entry[] = [];

  for (const dirent of visible.slice(0, MAX_ENTRIES)) {
    const full = path.join(dir, dirent.name);
    const isSymlink = dirent.isSymbolicLink();
    let isDirectory = dirent.isDirectory();
    let size = 0;
    let mtimeMs = 0;
    let birthtimeMs = 0;
    let dev: number | undefined;
    let ino: number | undefined;
    let storagePath: string | undefined;

    try {
      // Follow symlinks so aliased folders remain navigable.
      const stats = fs.statSync(full);
      isDirectory = stats.isDirectory();
      size = stats.size;
      mtimeMs = stats.mtimeMs;
      birthtimeMs = stats.birthtimeMs;
      dev = stats.dev;
      ino = stats.ino;
      if (isSymlink) storagePath = fs.realpathSync(full);
    } catch {
      // Keep broken or unreadable entries with limited metadata.
      try {
        const lstats = fs.lstatSync(full);
        size = lstats.size;
        mtimeMs = lstats.mtimeMs;
        birthtimeMs = lstats.birthtimeMs;
      } catch {
        /* leave zeroed */
      }
    }

    entries.push({
      name: dirent.name,
      path: full,
      storagePath,
      isDirectory,
      isSymlink,
      size,
      mtimeMs,
      birthtimeMs,
      dev,
      ino,
    });
  }

  return { entries, truncated };
}

/** Resolves a directory path and removes trailing separators. */
export function normalizeDir(full: string): string {
  return path.resolve(full);
}

export function isDirectory(full: string): boolean {
  try {
    return fs.statSync(full).isDirectory();
  } catch {
    return false;
  }
}

export type Place = { name: string; path: string };

const CLOUD_PROVIDER_NAMES: Record<string, string> = {
  GoogleDrive: "Google Drive",
  OneDrive: "OneDrive",
  Dropbox: "Dropbox",
  Box: "Box",
  pCloud: "pCloud",
  iCloudDrive: "iCloud Drive",
};

/** "GoogleDrive-you@example.com" → "Google Drive — you@example.com" */
function prettyCloudName(raw: string): string {
  const dash = raw.indexOf("-");
  const provider = dash === -1 ? raw : raw.slice(0, dash);
  const account = dash === -1 ? "" : raw.slice(dash + 1);
  const label =
    CLOUD_PROVIDER_NAMES[provider] ??
    provider.replace(/([a-z])([A-Z])/g, "$1 $2");
  return account ? `${label} — ${account}` : label;
}

/** Returns standard local folders and detected cloud drives. */
export function standardPlaces(): Place[] {
  const home = os.homedir();
  const places: Place[] = [{ name: "Home", path: home }];

  for (const name of ["Desktop", "Documents", "Downloads"]) {
    const full = path.join(home, name);
    if (isDirectory(full)) places.push({ name, path: full });
  }

  const icloud = path.join(
    home,
    "Library",
    "Mobile Documents",
    "com~apple~CloudDocs",
  );
  if (isDirectory(icloud)) places.push({ name: "iCloud Drive", path: icloud });

  const cloudRoot = path.join(home, "Library", "CloudStorage");
  try {
    for (const dirent of fs.readdirSync(cloudRoot, { withFileTypes: true })) {
      if (dirent.name.startsWith(".")) continue;
      const full = path.join(cloudRoot, dirent.name);
      if (isDirectory(full))
        places.push({ name: prettyCloudName(dirent.name), path: full });
    }
  } catch {
    return places;
  }

  return places;
}

/** Google Drive puts every shared folder behind a shortcut into this directory. */
export const SHORTCUT_TARGETS = ".shortcut-targets-by-id";

export type SharedCloudFolderResult = {
  folders: Place[];
  available: boolean;
};

/** Enumerates Google Drive shared-folder targets without walking their contents. */
export function sharedCloudFolderResult(
  cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
): SharedCloudFolderResult {
  const out: Place[] = [];
  let foundDrive = false;
  let readFailed = false;

  let drives: fs.Dirent[];
  try {
    drives = fs.readdirSync(cloudRoot, { withFileTypes: true });
  } catch {
    return { folders: out, available: false };
  }

  for (const drive of drives) {
    if (!drive.name.startsWith("GoogleDrive")) continue;
    foundDrive = true;
    const targets = path.join(cloudRoot, drive.name, SHORTCUT_TARGETS);
    let ids: fs.Dirent[];
    try {
      ids = fs.readdirSync(targets, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        readFailed = true;
      }
      continue;
    }
    for (const id of ids) {
      if (id.name.startsWith(".")) continue;
      const idDir = path.join(targets, id.name);
      try {
        for (const entry of fs.readdirSync(idDir, { withFileTypes: true })) {
          if (entry.name.startsWith(".")) continue;
          out.push({ name: entry.name, path: path.join(idDir, entry.name) });
        }
      } catch {
        readFailed = true;
        continue;
      }
    }
  }

  return { folders: out, available: foundDrive && !readFailed };
}

export function sharedCloudFolders(): Place[] {
  return sharedCloudFolderResult().folders;
}

/** Hides internal Google Drive target IDs from row subtitles. */
export function locationLabel(full: string): string {
  const marker = `${path.sep}${SHORTCUT_TARGETS}${path.sep}`;
  const at = full.indexOf(marker);
  if (at === -1) return displayPath(path.dirname(full));
  const drive = path.basename(full.slice(0, at));
  return `shared folder · ${drive}`;
}

/** Splits an absolute or home-relative path into a directory and name prefix. */
export function splitPathQuery(
  query: string,
): { dir: string; prefix: string } | undefined {
  const q = query.trim();
  if (!q.startsWith("/") && q !== "~" && !q.startsWith(`~${path.sep}`)) {
    return undefined;
  }

  const home = os.homedir();
  let full = q;
  if (q === "~") full = home + path.sep;
  else if (q.startsWith("~" + path.sep)) full = home + q.slice(1);

  if (full.endsWith(path.sep)) {
    return { dir: full.length > 1 ? full.slice(0, -1) : path.sep, prefix: "" };
  }
  return { dir: path.dirname(full), prefix: path.basename(full) };
}

export function statEntry(full: string): Entry | undefined {
  try {
    const linkStats = fs.lstatSync(full);
    const isSymlink = linkStats.isSymbolicLink();
    const stats = isSymlink ? fs.statSync(full) : linkStats;
    return {
      name: path.basename(full),
      path: full,
      storagePath: isSymlink ? fs.realpathSync(full) : undefined,
      isDirectory: stats.isDirectory(),
      isSymlink,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      birthtimeMs: stats.birthtimeMs,
      dev: stats.dev,
      ino: stats.ino,
    };
  } catch {
    return undefined;
  }
}

/** Resolves symlinks so aliases share one storage key. */
export function canonicalPath(full: string): string {
  try {
    return fs.realpathSync(full);
  } catch {
    return full;
  }
}

/** System locations excluded from global results. */
const SYSTEM_PREFIXES = [
  "/System",
  "/Library",
  "/usr",
  "/bin",
  "/sbin",
  "/opt",
  "/private",
  "/cores",
  "/dev",
  "/nix",
];

export function isSystemPath(full: string): boolean {
  return SYSTEM_PREFIXES.some(
    (prefix) => full === prefix || full.startsWith(prefix + path.sep),
  );
}

export function pathExists(full: string): boolean {
  try {
    fs.statSync(full);
    return true;
  } catch {
    return false;
  }
}

/** Finds hidden child directories whose names begin with a requested dot term. */
export function hiddenDirsMatching(base: string, terms: string[]): string[] {
  if (terms.length === 0) return [];
  const wanted = terms.map((t) => t.toLowerCase());

  const out: string[] = [];
  for (const entry of readDirectory(base, true).entries) {
    if (!entry.isDirectory || !entry.name.startsWith(".")) continue;
    const name = entry.name.toLowerCase();
    if (wanted.some((t) => name.startsWith(t))) out.push(entry.path);
  }
  return out;
}
