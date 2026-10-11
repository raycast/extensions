/**
 * Single source of truth for platform-specific filesystem defaults the
 * extension uses to locate CLI binaries. New defaults — a new package
 * manager, a new install pattern — go here, not scattered through caller
 * code. Browser cookie/profile paths live separately in `browsers.ts`
 * because they have a different shape (per-browser, with native/Firefox-
 * fork/Chromium-fork variants).
 *
 * Design notes:
 *   - macOS paths use `path.posix.join`; Windows paths use `path.win32.join`.
 *     Always go through the platform-specific submodule rather than the
 *     host-dependent `path.join`, so a test running on a Mac with a
 *     Windows platform mock still produces back-slashed strings and a
 *     test on Windows with a Mac mock still produces forward-slashed
 *     ones. Node accepts either separator on Windows, but matching the
 *     canonical convention keeps tests portable and lets us compare
 *     against hardcoded expected paths in either suite.
 *   - Nothing here actually touches the filesystem — callers compose these
 *     dirs into candidate paths and check `fs.existsSync`. Keeps the
 *     module pure and testable.
 */

import * as os from "node:os";
import * as path from "node:path";

/**
 * macOS install locations a Raycast (GUI-launched) process can't reach via
 * the login shell's PATH. Order matters: Apple Silicon Homebrew first, then
 * Intel Homebrew / pipx-system / Cargo (/usr/local/bin), then MacPorts,
 * then per-user locations (pipx user, Cargo user, pyenv shims), then the
 * system bins. Callers typically union this with `process.env.PATH` entries
 * (whatever Raycast inherited) and dedupe.
 */
export function macBinarySearchDirs(home: string): string[] {
  return [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/opt/local/bin",
    path.posix.join(home, ".local/bin"),
    path.posix.join(home, ".cargo/bin"),
    path.posix.join(home, ".pyenv/shims"),
    "/usr/bin",
    "/bin",
  ];
}

/**
 * Windows shim/bin directories the user likely has tools in. winget's
 * per-package install dirs are NOT included here — their names contain
 * version-locked suffixes (e.g. `yt-dlp.yt-dlp_Microsoft.Winget.Source_…`),
 * so callers enumerate them dynamically via `fs.readdirSync`. Empty values
 * for unknown env are filtered out so callers don't have to.
 */
export function windowsBinarySearchDirs({
  localAppData,
  userProfile,
}: {
  localAppData: string;
  userProfile: string;
}): string[] {
  const dirs: string[] = [];
  if (localAppData) dirs.push(path.win32.join(localAppData, "Microsoft", "WinGet", "Links"));
  dirs.push(path.win32.join("C:\\", "ProgramData", "chocolatey", "bin"));
  if (userProfile) dirs.push(path.win32.join(userProfile, "scoop", "shims"));
  return dirs;
}

/**
 * Resolve LOCALAPPDATA + USERPROFILE on Windows. Raycast's extension process
 * routinely launches without either env var set, so we layer fallbacks:
 *   - `os.homedir()` reads from USERPROFILE first, then HOMEDRIVE+HOMEPATH,
 *     then the Win32 GetUserProfileDirectory API. It returns the user's
 *     profile dir even when no env vars are set.
 *   - APPDATA, when present, points at `<home>\AppData\Roaming`; the
 *     sibling Local dir is a literal substring swap.
 *   - As a final fallback, `<home>\AppData\Local` is the standard layout
 *     since Vista, so deriving it from the home dir is safe.
 * Exported because both `findWindowsBinary` and `getWingetPath` need the
 * same Raycast-safe resolution.
 */
export function windowsUserDirs(env: NodeJS.ProcessEnv = process.env): {
  localAppData: string;
  userProfile: string;
} {
  const userProfile = env.USERPROFILE || os.homedir() || "";
  let localAppData = env.LOCALAPPDATA || "";
  if (!localAppData && env.APPDATA) {
    const idx = env.APPDATA.lastIndexOf("\\Roaming");
    if (idx > 0) localAppData = env.APPDATA.slice(0, idx) + "\\Local";
  }
  if (!localAppData && userProfile) {
    localAppData = path.win32.join(userProfile, "AppData", "Local");
  }
  return { localAppData, userProfile };
}

/**
 * Canonical location of the winget CLI on Windows. winget is shipped as an
 * MSIX package and installs its launcher into `WindowsApps` regardless of
 * which version is on the user's PATH, so this is a reliable fallback when
 * Raycast's stripped PATH doesn't include winget's directory.
 */
export function windowsWingetPath(env: NodeJS.ProcessEnv = process.env): string {
  const { localAppData } = windowsUserDirs(env);
  if (!localAppData) return "";
  return path.win32.join(localAppData, "Microsoft", "WindowsApps", "winget.exe");
}

/**
 * The stable fallback returned when no real install is found. Lets the
 * Installer view show "{path} not installed" without crashing on undefined,
 * and gives error toasts something concrete to report. NOT a runnable
 * path — callers must check `fs.existsSync` before spawning.
 *
 *   - macOS: Apple Silicon Homebrew prefix is the most common install.
 *   - Windows: empty string. Without `where` succeeding there's no sane
 *     default; the empty value cleanly fails `fs.existsSync`, which sends
 *     the user to the Installer.
 *   - Linux: standard system bin.
 */
export function defaultBinaryFallback(name: string, platform: NodeJS.Platform): string {
  if (platform === "darwin") return `/opt/homebrew/bin/${name}`;
  if (platform === "win32") return "";
  return `/usr/bin/${name}`;
}

/** Apple Silicon Homebrew CLI location. Used as the default for `findHomebrewPath` when nothing is on disk. */
export const HOMEBREW_DEFAULT_PATH = "/opt/homebrew/bin/brew";

/**
 * The Rosetta 2 runtime path on macOS. The file's existence is the cheap,
 * no-spawn check the extension uses to decide whether the x86_64-only
 * spotDL prebuilt binary will run on Apple Silicon. Absent on a clean
 * Apple Silicon Mac until `softwareupdate --install-rosetta`.
 */
export const ROSETTA_RUNTIME_PATH = "/Library/Apple/usr/share/rosetta/rosetta";

/**
 * Filesystem env vars Raycast on Windows is known to drop from its
 * extension process. Documenting them here so callers know to layer
 * fallbacks (os.homedir(), APPDATA's Roaming sibling) rather than
 * assuming env.LOCALAPPDATA is always set.
 */
export const WINDOWS_ENV_VARS_MISSING_IN_RAYCAST = ["LOCALAPPDATA", "USERPROFILE"] as const;
