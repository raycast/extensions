import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import {
  defaultBinaryFallback,
  HOMEBREW_DEFAULT_PATH,
  macBinarySearchDirs,
  windowsBinarySearchDirs,
  windowsUserDirs,
} from "./platform-paths.js";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

function whichWindows(name: string): string {
  try {
    return execFileSync("where", [name])
      .toString()
      .split("\n")[0]
      .replace(/[\r\n]/g, "")
      .trim();
  } catch {
    return "";
  }
}

/** Mac search dirs from the platform-paths source-of-truth, deduped with the inherited PATH. */
function macSearchDirs(home: string, env: NodeJS.ProcessEnv): string[] {
  const pathEntries = (env.PATH ?? "").split(":").filter(Boolean);
  return Array.from(new Set([...macBinarySearchDirs(home), ...pathEntries]));
}

function findInDirs(name: string, dirs: string[]): string {
  for (const dir of dirs) {
    const candidate = path.posix.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

/**
 * Module-level cache of the winget Packages directory listing. The form can
 * invoke binary resolution for every required tool in a single render (yt-dlp
 * + ffmpeg + ffprobe + deno), so caching the top-level listing turns N
 * `readdirSync` calls into one for the common case. Invalidated on extension
 * reload (process restart) and explicitly after winget install/upgrade flows
 * that may change package directories.
 */
let cachedWingetPackages: { dir: string; entries: string[] } | undefined;
function readWingetPackages(packagesDir: string): string[] | undefined {
  if (cachedWingetPackages && cachedWingetPackages.dir === packagesDir) return cachedWingetPackages.entries;
  try {
    const entries = fs.readdirSync(packagesDir);
    cachedWingetPackages = { dir: packagesDir, entries };
    return entries;
  } catch {
    return undefined;
  }
}

/**
 * Invalidate the cached winget Packages listing. Call after a successful
 * `winget install`/upgrade (or after winget reports the package was already
 * installed) so the next `resolveBinary` re-reads the directory and picks
 * up the just-installed binary, instead of returning a stale "not found"
 * from a listing taken before the install happened. Also used by tests to
 * isolate specs.
 */
export function resetWingetPackagesCache(): void {
  cachedWingetPackages = undefined;
}

/**
 * Search well-known Windows install locations that Raycast's PATH typically
 * misses. Raycast's extension process on Windows usually inherits a stripped
 * PATH that doesn't include winget's per-package install dirs, so `where`
 * returns nothing even when the user has the tool installed via `winget`.
 *
 * The function checks, in order: every entry in env.PATH directly (covers
 * cases where `where.exe` itself isn't available); the winget Links shim
 * dir; Chocolatey's bin; Scoop's shims; and finally iterates the winget
 * Packages dirs — `<pkg-dir>\<name>.exe` for the flat layout (yt-dlp,
 * monolith, etc.) and `<pkg-dir>\<version-subdir>\bin\<name>.exe` for the
 * nested layout (yt-dlp.FFmpeg ships ffmpeg/ffprobe there). Package dirs
 * aren't hardcoded so we don't have to maintain a parallel list of winget
 * IDs. Uses `path.win32.join` throughout so tests on a Mac host with a
 * Windows platform mock still produce back-slashed strings.
 */
function findWindowsBinary(name: string, env: NodeJS.ProcessEnv): string {
  const exe = `${name}.exe`;
  const { localAppData, userProfile } = windowsUserDirs(env);

  // Iterate PATH entries directly — when Raycast strips PATH partially or
  // `where.exe` itself isn't on this process's PATH, we still get a hit if
  // the install dir is anywhere we can read.
  for (const dir of (env.PATH ?? "").split(";").filter(Boolean)) {
    const candidate = path.win32.join(dir, exe);
    if (fs.existsSync(candidate)) return candidate;
  }

  for (const dir of windowsBinarySearchDirs({ localAppData, userProfile })) {
    const candidate = path.win32.join(dir, exe);
    if (fs.existsSync(candidate)) return candidate;
  }

  if (!localAppData) return "";
  const packagesDir = path.win32.join(localAppData, "Microsoft", "WinGet", "Packages");
  const packages = readWingetPackages(packagesDir);
  if (!packages) return "";
  for (const entry of packages) {
    const pkgDir = path.win32.join(packagesDir, entry);
    const flat = path.win32.join(pkgDir, exe);
    if (fs.existsSync(flat)) return flat;
    // Nested-bin layout (ffmpeg, ffprobe). Skip unreadable subdirs silently —
    // a `.db` file or a locked dir shouldn't abort the whole search.
    let subdirs: string[];
    try {
      subdirs = fs.readdirSync(pkgDir);
    } catch {
      continue;
    }
    for (const sub of subdirs) {
      const nested = path.win32.join(pkgDir, sub, "bin", exe);
      if (fs.existsSync(nested)) return nested;
    }
  }
  return "";
}

/**
 * Resolve the path to a CLI binary. Precedence: the user-configured preference
 * path if it exists on disk; else, for an extension-managed binary, the file
 * inside `managedDir`; else a search across well-known install locations on
 * the current platform; else a stable fallback so the Installer view has a
 * path to surface in its "not installed" error.
 */
export function resolveBinary(name: string, preferencePath?: string, managedDir?: string): string {
  const platform = process.platform;
  const pref = platform === "win32" ? preferencePath?.replace(/[\r\n]/g, "").trim() : preferencePath;
  if (pref && fs.existsSync(pref)) return pref;
  // `path.posix.join` keeps test output deterministic across host platforms
  // (a Mac-mocking test running on Windows would otherwise see `\` separators).
  // Node accepts forward slashes in paths on Windows, so this also works in
  // production when `managedDir` is `environment.supportPath` (a Windows path).
  const managedPath = managedDir ? path.posix.join(managedDir, platform === "win32" ? `${name}.exe` : name) : undefined;
  if (managedPath && fs.existsSync(managedPath)) return managedPath;
  if (platform === "darwin") {
    const found = findInDirs(name, macSearchDirs(os.homedir(), process.env));
    if (found) return found;
  } else if (platform === "win32") {
    const fromPath = whichWindows(name);
    if (fromPath) return fromPath;
    const fromWellKnown = findWindowsBinary(name, process.env);
    if (fromWellKnown) return fromWellKnown;
  }
  if (managedPath) return managedPath;
  return defaultBinaryFallback(name, platform);
}

/**
 * Best-effort Homebrew CLI discovery. Apple Silicon defaults to
 * `/opt/homebrew/bin/brew`; Intel Macs to `/usr/local/bin/brew`. Returns the
 * first one that exists on disk, or `/opt/homebrew/bin/brew` as a stable
 * fallback so the Installer can still surface "Cannot find Homebrew".
 */
export function findHomebrewPath(home: string = os.homedir(), env: NodeJS.ProcessEnv = process.env): string {
  const found = findInDirs("brew", macSearchDirs(home, env));
  return found || HOMEBREW_DEFAULT_PATH;
}
