import { accessSync, constants, lstatSync, realpathSync } from "fs";
import { basename, dirname, isAbsolute, normalize, relative, resolve, sep } from "path";
import { APP_ROOTS, SEARCH_ROOTS } from "./locations";

/**
 * Every directory a path must live under to be eligible for removal.
 *
 * Nothing outside this set can ever be deleted by the extension, no matter
 * what the scanner produced or what the user selected in the UI. This is the
 * last line of defence and it is enforced again immediately before deletion.
 */
const REMOVABLE_ROOTS: { path: string; depth: number }[] = [
  ...APP_ROOTS.map((root) => ({ path: root.path, depth: 1 })),
  ...SEARCH_ROOTS.map((root) => ({ path: root.path, depth: root.depth })),
];

const ROOT_PATHS = new Set(REMOVABLE_ROOTS.map((root) => root.path));

/**
 * The most specific root containing `target`.
 *
 * Roots nest — `Preferences/ByHost` sits inside `Preferences`, `Applications/Utilities`
 * inside `Applications` — and each nested root carries its own depth budget, so the
 * longest match is the one whose rules apply.
 */
function findRoot(target: string): { path: string; depth: number } | undefined {
  let best: { path: string; depth: number } | undefined;
  for (const root of REMOVABLE_ROOTS) {
    if (isInside(root.path, target) && (!best || root.path.length > best.path.length)) {
      best = root;
    }
  }
  return best;
}

/**
 * Names that must never be removed at any depth: macOS-owned data, and the
 * applications that make the extension itself work.
 */
const PROTECTED_NAMES = new Set(
  [
    "Apple",
    "AddressBook",
    "CallHistoryDB",
    "CallHistoryTransactions",
    "CloudDocs",
    "FileProvider",
    "Keychains",
    "Knowledge",
    "Mail",
    "MobileSync",
    "Mobile Documents",
    "Safari",
    "SafariSafeBrowsing",
    "SyncServices",
    "iCloud",
    "Raycast.app",
    "Finder.app",
    "System Settings.app",
  ].map((name) => name.toLowerCase()),
);

/**
 * Directories that hold data for *several* applications.
 *
 * The directory itself is never removable — deleting `Application Support/Google`
 * while uninstalling Chrome would also destroy every other Google application's
 * data — but a single app's folder inside one is a legitimate target, which is
 * why this is checked separately from `PROTECTED_NAMES`.
 */
const SHARED_CONTAINER_NAMES = new Set(
  [
    "Adobe",
    "Chromium",
    "CrashReporter",
    "Firefox",
    "Google",
    "JetBrains",
    "Java",
    "Logitech",
    "Microsoft",
    "Mozilla",
    "Node",
    "Steam",
    "Xcode",
    "electron",
    "npm",
    "pip",
    "python",
    "Utilities",
    "Setapp",
  ].map((name) => name.toLowerCase()),
);

/** Reverse-domain prefixes that always belong to macOS. */
const DENIED_PREFIXES = ["com.apple.", "group.com.apple.", "apple.", "systemgroup."];

export class UnsafePathError extends Error {
  constructor(
    readonly path: string,
    reason: string,
  ) {
    super(`Refusing to remove ${path}: ${reason}`);
    this.name = "UnsafePathError";
  }
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Resolve symlinks on the *parent* of `target` rather than on `target` itself.
 *
 * A leftover may legitimately be a symlink, in which case we want to remove the
 * link and not whatever it points at. Resolving the parent still defeats the
 * escape we actually care about: a symlinked directory inside a search root
 * that redirects the final path somewhere sensitive.
 */
function resolveThroughParent(target: string): string {
  const parent = dirname(target);
  let realParent: string;
  try {
    realParent = realpathSync(parent);
  } catch {
    // Parent is gone; the path cannot be inside a root we can verify.
    throw new UnsafePathError(target, "parent directory could not be resolved");
  }
  return resolve(realParent, basename(target));
}

export interface SafeTarget {
  /** The path as the caller supplied it. */
  path: string;
  /** The path with the parent's symlinks resolved. Both are checked. */
  resolvedPath: string;
  root: string;
  /** True when the parent directory is not writable and `sudo` would be needed. */
  needsAdmin: boolean;
}

/**
 * Validate that `target` may be removed, or throw `UnsafePathError`.
 *
 * A path is removable only when all of the following hold:
 *  - it is absolute and free of `..` segments
 *  - it resolves (through its parent) to somewhere strictly inside a known root
 *  - it is not a root itself
 *  - it sits no deeper below that root than the root declares
 *  - neither the literal nor the resolved path leaves the root
 *  - its first component below the root is not denied by name or prefix
 */
export function checkRemovable(target: string): SafeTarget {
  if (!target || !isAbsolute(target)) {
    throw new UnsafePathError(target, "path is not absolute");
  }
  if (normalize(target) !== target || target.endsWith(sep)) {
    throw new UnsafePathError(target, "path is not normalized");
  }

  const resolvedPath = resolveThroughParent(target);

  const root = findRoot(target);
  if (!root) {
    throw new UnsafePathError(target, "path is outside every known application location");
  }
  if (!isInside(root.path, resolvedPath)) {
    throw new UnsafePathError(target, "path resolves outside its root through a symlink");
  }
  if (ROOT_PATHS.has(target) || ROOT_PATHS.has(resolvedPath)) {
    throw new UnsafePathError(target, "path is a search root itself");
  }

  const segments = relative(root.path, target).split(sep);
  if (segments.length > root.depth) {
    throw new UnsafePathError(target, `path is deeper than ${root.depth} level(s) below ${root.path}`);
  }

  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (PROTECTED_NAMES.has(lower) || DENIED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      throw new UnsafePathError(target, `"${segment}" is owned by macOS or required by the system`);
    }
  }
  if (segments.length === 1 && SHARED_CONTAINER_NAMES.has(segments[0].toLowerCase())) {
    throw new UnsafePathError(target, `"${segments[0]}" holds data for several applications`);
  }

  return { path: target, resolvedPath, root: root.path, needsAdmin: needsAdminToRemove(target) };
}

export function isRemovable(target: string): boolean {
  try {
    checkRemovable(target);
    return true;
  } catch {
    return false;
  }
}

function isWritable(target: string): boolean {
  try {
    accessSync(target, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether moving `target` to the Trash requires administrator rights.
 *
 * Two conditions, and the second is easy to miss. Removing an entry needs write
 * permission on its *parent* — `/Applications` is group-writable by admins, so
 * that much is usually satisfied. But moving a *directory* to a different parent
 * also rewrites its `..` entry, which needs write permission on the directory
 * itself.
 *
 * That is what puts an application installed from the App Store out of reach:
 * its bundle is `drwxr-xr-x root:wheel`, so its owner can rename it inside
 * `/Applications` but cannot move it out, however group-writable the folder is.
 * Ordinary files are not affected, which is why an app's leftovers can move to
 * the Trash while the app itself cannot.
 */
export function needsAdminToRemove(target: string): boolean {
  if (!isWritable(dirname(target))) return true;

  try {
    return lstatSync(target).isDirectory() && !isWritable(target);
  } catch {
    // Already gone: nothing left to need rights for.
    return false;
  }
}

/** Quote a path for a shell command shown to the user. Single quotes only. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
