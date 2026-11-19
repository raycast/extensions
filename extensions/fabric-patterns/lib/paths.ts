// Every file the extension writes goes through here. A target is refused if
// it resolves under fabric's built-in patterns folder (ISC-8), a new file is
// opened with `wx` so nothing is ever overwritten, and the parent is resolved
// with realpath so a symlink or `..` can't walk around the check.

import {
  accessSync,
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  statSync,
  writeSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";

export class PathError extends Error {}

const FILE_NAME = /^[A-Za-z0-9_][A-Za-z0-9_. -]*$/;
/** One plain file name: no slash, no leading dot, no `..`. */
export const isPlainFileName = (name: string) => FILE_NAME.test(name) && !name.includes("..");

/**
 * Folders no answer is ever saved into, whichever way it is saved (Save to File, Save as…, a
 * background run's Save Folder): a LaunchAgent runs at login, ~/.ssh holds keys, and fabric's own
 * folder holds its .env and patterns.
 */
export const refusedFolders = (home: string, fabricDir: string) => [
  join(home, "Library", "LaunchAgents"),
  join(home, ".ssh"),
  fabricDir,
];

function under(child: string, root: string): boolean {
  const c = child.toLowerCase() + sep;
  const r = root.toLowerCase() + sep;
  return c.startsWith(r);
}

/** `path` resolved through symlinks as far as it exists, with the missing tail re-joined. */
function realish(path: string): string {
  let base = resolve(path);
  const rest: string[] = [];
  for (;;) {
    try {
      base = realpathSync(base);
      break;
    } catch {
      const parent = dirname(base);
      if (parent === base) break;
      rest.unshift(basename(base));
      base = parent;
    }
  }
  return join(base, ...rest);
}

/** True when `path` is the protected root or inside it; both sides are resolved the same way, existing or not. */
export function inProtected(path: string, protectedRoot: string): boolean {
  return under(realish(path), realish(protectedRoot));
}

/**
 * Cleans a path pasted into a Preferences text field: trims it, drops
 * surrounding quotes, decodes a `file://` URL and expands a leading `~`.
 * Anything still relative is left for guardDir to refuse.
 */
export function pastedPath(raw: string | undefined, home: string): string | undefined {
  let p = raw?.trim();
  if (!p) return undefined;
  const q = p[0];
  if ((q === '"' || q === "'") && p.length > 1 && p.endsWith(q)) p = p.slice(1, -1).trim();
  if (!p) return undefined;
  if (p.startsWith("file://")) {
    try {
      p = decodeURIComponent(new URL(p).pathname);
    } catch {
      return p;
    }
  }
  if (p === "~") return home;
  if (p.startsWith("~/")) p = join(home, p.slice(2));
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** Where Homebrew installs fabric; the Preferences default. */
export const DEFAULT_FABRIC_PATH = "/opt/homebrew/bin/fabric-ai";

/** Where Homebrew installs on an Intel Mac; tried only for the default setting, only on x64. */
export const INTEL_FABRIC_PATHS = ["/usr/local/bin/fabric-ai", "/usr/local/bin/fabric"];

/** A regular file this process may execute: not a directory, not a plain data file. */
export function isRunnableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The fabric binary to run: the configured path, or its sibling when only that exists
 * (Homebrew names it fabric-ai, other installs fabric). Left at the default on an Intel
 * Mac, Homebrew's /usr/local/bin is tried last; a path the user typed is never swapped
 * for it, and Apple Silicon never looks there (a leftover Intel install isn't ours to run).
 * None there → the configured path, so the not-found state names what the user set.
 */
export function resolveFabricPath(
  configured: string,
  runnable: (path: string) => boolean,
  arch: string = process.arch,
): string {
  if (runnable(configured)) return configured;
  const dir = dirname(configured);
  const name = basename(configured);
  const sibling = name === "fabric" ? "fabric-ai" : name === "fabric-ai" ? "fabric" : undefined;
  if (sibling && runnable(join(dir, sibling))) return join(dir, sibling);
  if (configured !== DEFAULT_FABRIC_PATH || arch !== "x64") return configured;
  return INTEL_FABRIC_PATHS.find(runnable) ?? configured;
}

/** A path for display: the home folder as `~`, so a screenshot doesn't carry the user name. */
export function tildify(path: string, home: string): string {
  const h = home.length > 1 ? home.replace(/\/+$/, "") : home;
  if (path === h) return "~";
  return path.startsWith(`${h}/`) ? `~${path.slice(h.length)}` : path;
}

/** Text for display (an error message, say) with every home path written as `~`. */
export function scrubHome(text: string, home: string): string {
  const h = home.replace(/\/+$/, "");
  if (!h) return text;
  // The home folder itself counts only where its name ends: /Users/mike, not /Users/mike2.
  const bare = new RegExp(`${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w.-])`, "g");
  return text.split(`${h}/`).join("~/").replace(bare, "~");
}

/**
 * Resolves `dir` (creating it) and refuses it if it lands in the protected root, or in any of
 * `alsoRefused` (every answer save passes refusedFolders: where a file runs code or holds keys).
 */
export function guardDir(dir: string, protectedRoot: string, alsoRefused: readonly string[] = []): string {
  if (!dir.startsWith("/")) throw new PathError(`folder must be an absolute path: ${dir}`);
  // The kernel resolves a symlink before a following `..`, but resolve()/realpath work on
  // the string, so `link/../x` could be checked as one folder and created as another.
  if (dir.split("/").some((s) => s === "." || s === ".."))
    throw new PathError(`folder can't contain . or .. segments: ${dir}`);
  // Checked before mkdir too, so a refused folder is never created (ISC-8).
  if (inProtected(dir, protectedRoot)) throw new PathError("fabric's built-in patterns folder is never written to");
  const refuse = (path: string) => {
    const root = alsoRefused.find((r) => inProtected(path, r));
    if (root) throw new PathError(`never saved into ${root}`);
  };
  refuse(dir);
  let realDir: string;
  try {
    mkdirSync(dir, { recursive: true });
    realDir = realpathSync(dir);
  } catch (e) {
    throw new PathError(`can't use folder ${dir}: ${(e as Error).message}`);
  }
  if (under(realDir, realish(protectedRoot)))
    throw new PathError("fabric's built-in patterns folder is never written to");
  refuse(realDir);
  return realDir;
}

function claim(path: string): number | undefined {
  try {
    if (lstatSync(path).isSymbolicLink()) return undefined;
  } catch {
    /* absent: good */
  }
  try {
    return openSync(path, "wx", 0o644);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return undefined;
    throw e;
  }
}

/** Writes `text` to a new file in `dir`; a taken name becomes `name-2.ext`, `name-3.ext`… */
export function writeNewFile(
  dir: string,
  name: string,
  text: string,
  protectedRoot: string,
  alsoRefused: readonly string[] = [],
): string {
  if (!isPlainFileName(name)) throw new PathError(`not a plain file name: ${name}`);
  const realDir = guardDir(dir, protectedRoot, alsoRefused);
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 1; i < 1000; i++) {
    const path = join(realDir, i === 1 ? name : `${stem}-${i}${ext}`);
    const fd = claim(path);
    if (fd === undefined) continue;
    try {
      writeSync(fd, text);
    } finally {
      closeSync(fd);
    }
    return path;
  }
  throw new PathError(`no free file name for ${name} in ${dir}`);
}
