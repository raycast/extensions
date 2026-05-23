import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";

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

/**
 * Install locations a Raycast (GUI-launched) process can't reach via the login
 * shell's PATH. Apple Silicon Homebrew is checked first, then Intel Homebrew /
 * pipx-system / Cargo (`/usr/local/bin`), then MacPorts, then per-user
 * locations (pipx user, Cargo user, pyenv shims), then the system bins.
 * Anything in `process.env.PATH` (whatever Raycast inherited) is appended
 * last, deduped.
 */
function macSearchDirs(home: string, env: NodeJS.ProcessEnv): string[] {
  const wellKnown = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/opt/local/bin",
    path.join(home, ".local/bin"),
    path.join(home, ".cargo/bin"),
    path.join(home, ".pyenv/shims"),
    "/usr/bin",
    "/bin",
  ];
  const pathEntries = (env.PATH ?? "").split(":").filter(Boolean);
  return Array.from(new Set([...wellKnown, ...pathEntries]));
}

function findInDirs(name: string, dirs: string[]): string {
  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
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
  const managedPath = managedDir ? path.join(managedDir, platform === "win32" ? `${name}.exe` : name) : undefined;
  if (managedPath && fs.existsSync(managedPath)) return managedPath;
  if (platform === "darwin") {
    const found = findInDirs(name, macSearchDirs(os.homedir(), process.env));
    if (found) return found;
  } else if (platform === "win32") {
    const found = whichWindows(name);
    if (found) return found;
  }
  if (managedPath) return managedPath;
  if (platform === "darwin") return `/opt/homebrew/bin/${name}`;
  if (platform === "win32") return "";
  return `/usr/bin/${name}`;
}

/**
 * Best-effort Homebrew CLI discovery. Apple Silicon defaults to
 * `/opt/homebrew/bin/brew`; Intel Macs to `/usr/local/bin/brew`. Returns the
 * first one that exists on disk, or `/opt/homebrew/bin/brew` as a stable
 * fallback so the Installer can still surface "Cannot find Homebrew".
 */
export function findHomebrewPath(home: string = os.homedir(), env: NodeJS.ProcessEnv = process.env): string {
  const found = findInDirs("brew", macSearchDirs(home, env));
  return found || "/opt/homebrew/bin/brew";
}
