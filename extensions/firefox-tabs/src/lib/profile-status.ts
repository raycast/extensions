import { execFile, execFileSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import type { FirefoxProfile } from "./profiles";

export const EXTENSION_ID = "raycast-firefox@lau.engineering";

/**
 * Whether the companion extension is installed in a profile, from the
 * profile's `extensions.json`. "unknown" means Firefox hasn't written that
 * file, which happens until a profile has been started once.
 */
export type ExtensionState = "installed" | "disabled" | "missing" | "unknown";

export function readExtensionState(
  profilePath: string,
  read: (file: string) => string = (file) => readFileSync(file, "utf-8")
): ExtensionState {
  let data: { addons?: Array<{ id?: string; active?: boolean; visible?: boolean }> };
  try {
    data = JSON.parse(read(join(profilePath, "extensions.json")));
  } catch {
    return "unknown";
  }
  const addon = data.addons?.find((a) => a.id === EXTENSION_ID && a.visible !== false);
  if (!addon) return "missing";
  return addon.active ? "installed" : "disabled";
}

/**
 * Map each running profile directory to its Firefox PID from
 * `lsof -a -c firefox -Fpn` output. Every Firefox process holds `.parentlock`
 * open in its profile; other `.parentlock` files (such as the update
 * directory's) are skipped because they have no `prefs.js` next to them.
 */
export function parseRunningProfiles(
  output: string,
  exists: (file: string) => boolean = existsSync
): Map<string, number> {
  const running = new Map<string, number>();
  let pid: number | null = null;
  for (const line of output.split("\n")) {
    if (line.startsWith("p")) {
      pid = parseInt(line.slice(1), 10) || null;
    } else if (pid !== null && line.startsWith("n") && line.endsWith("/.parentlock")) {
      const dir = dirname(line.slice(1));
      if (exists(join(dir, "prefs.js"))) running.set(resolve(dir), pid);
    }
  }
  return running;
}

/** Running Firefox profiles and their PIDs. Resolves empty if lsof fails. */
export function findRunningProfiles(): Promise<Map<string, number>> {
  return new Promise((resolvePromise) => {
    execFile(
      "lsof",
      ["-a", "-c", "firefox", "-Fpn"],
      { timeout: 5000, maxBuffer: 32 * 1024 * 1024 },
      // lsof exits 1 when some files can't be listed but still prints the rest.
      (_err, stdout) => resolvePromise(parseRunningProfiles(String(stdout ?? "")))
    );
  });
}

/**
 * What a profile needs before Raycast can see its tabs:
 * - connected: its native host is serving tabs
 * - needs-install: running without the companion extension
 * - disabled: running with the extension turned off
 * - not-connected: running with the extension, but no native host answered
 * - not-running: Firefox isn't running with this profile
 */
export type ProfileSetupState = "connected" | "needs-install" | "disabled" | "not-connected" | "not-running";

export interface ProfileStatus {
  profile: FirefoxProfile;
  firefoxPid: number | null;
  extension: ExtensionState;
  state: ProfileSetupState;
}

/**
 * Work out the setup state of every known profile, plus any running profile
 * Firefox's profile lists don't know about (one started with `--profile`).
 *
 * `connectedPaths` holds each serving host's profile path, or null for a
 * host that can't say which profile it serves (one from before per-profile
 * records, or whose profile lookup failed). Such a host is serving one of
 * the running profiles that have the extension, so none of those is
 * reported as not connected.
 */
export function profileStatuses(
  profiles: FirefoxProfile[],
  running: Map<string, number>,
  connectedPaths: Array<string | null>,
  extensionState: (profilePath: string) => ExtensionState = readExtensionState
): ProfileStatus[] {
  const connected = new Set(connectedPaths.filter((p): p is string => !!p).map((p) => resolve(p)));
  const unattributedHost = connectedPaths.some((p) => !p);
  const known = new Set(profiles.map((p) => p.path));
  const extra: FirefoxProfile[] = [...running.keys()]
    .filter((path) => !known.has(path))
    .map((path) => ({ path, name: basename(path), avatar: null }));

  return [...profiles, ...extra].map((profile) => {
    const firefoxPid = running.get(profile.path) ?? null;
    const extension = extensionState(profile.path);
    let state: ProfileSetupState;
    if (connected.has(profile.path)) {
      state = "connected";
    } else if (firefoxPid === null) {
      state = "not-running";
    } else if (extension === "installed") {
      state = unattributedHost ? "connected" : "not-connected";
    } else if (extension === "disabled") {
      state = "disabled";
    } else {
      // A running profile always has extensions.json, so "unknown" means missing.
      state = "needs-install";
    }
    return { profile, firefoxPid, extension, state };
  });
}

/** Running profiles that are not delivering tabs to Raycast. */
export function profilesNeedingSetup(statuses: ProfileStatus[]): ProfileStatus[] {
  return statuses.filter((s) => s.state !== "connected" && s.state !== "not-running");
}

/** Whether `path` is the executable inside a Firefox app bundle. */
export function isFirefoxExecutable(path: string): boolean {
  return /\.app\/Contents\/MacOS\/firefox$/.test(path.trim());
}

function executableOf(pid: number): string {
  try {
    return execFileSync("ps", ["-o", "comm=", "-p", String(pid)], { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

/** PIDs of every running Firefox process (one per running profile). */
export function runningFirefoxPids(): number[] {
  try {
    return execFileSync("pgrep", ["-x", "firefox"], { encoding: "utf-8" })
      .split("\n")
      .map((line) => parseInt(line, 10))
      .filter((pid) => pid > 0);
  } catch {
    return [];
  }
}

const DEFAULT_EXECUTABLES = ["Firefox", "Firefox Developer Edition", "Firefox Nightly"].flatMap((name) => [
  `/Applications/${name}.app/Contents/MacOS/firefox`,
  join(homedir(), "Applications", `${name}.app`, "Contents", "MacOS", "firefox"),
]);

/**
 * The Firefox executable a profile last ran with, from the LastPlatformDir
 * in its compatibility.ini (".../Firefox.app/Contents/Resources"), or null.
 */
export function lastFirefoxExecutable(
  profilePath: string,
  read: (file: string) => string = (file) => readFileSync(file, "utf-8")
): string | null {
  let text: string;
  try {
    text = read(join(profilePath, "compatibility.ini"));
  } catch {
    return null;
  }
  const dir = text.match(/^LastPlatformDir=(.+)$/m)?.[1]?.trim();
  return dir && /\.app\/Contents\/Resources$/.test(dir) ? join(dirname(dir), "MacOS", "firefox") : null;
}

/**
 * The Firefox executable to start for a profile, so Developer Edition,
 * Nightly and copies outside /Applications work, and a profile isn't opened
 * (and so upgraded) by a different Firefox:
 * 1. the one the profile is running from;
 * 2. the one it last ran with (compatibility.ini);
 * 3. a standard install;
 * 4. the one another running profile uses.
 * Null if there is none.
 */
export function firefoxExecutableFor(
  firefoxPid: number | null,
  profilePath: string,
  otherFirefoxPids: number[],
  {
    executable = executableOf,
    exists = existsSync,
    defaults = DEFAULT_EXECUTABLES,
    lastUsed = lastFirefoxExecutable,
  }: {
    executable?: (pid: number) => string;
    exists?: (path: string) => boolean;
    defaults?: string[];
    lastUsed?: (profilePath: string) => string | null;
  } = {}
): string | null {
  if (firefoxPid !== null) {
    const own = executable(firefoxPid);
    if (isFirefoxExecutable(own)) return own;
  }
  const last = lastUsed(profilePath);
  if (last && exists(last)) return last;
  const standard = defaults.find((path) => exists(path));
  if (standard) return standard;
  for (const pid of otherFirefoxPids) {
    const path = executable(pid);
    if (isFirefoxExecutable(path)) return path;
  }
  return null;
}

/**
 * Open `url` in a specific Firefox profile by starting Firefox's own
 * executable with `--profile`. If that profile is already running, Firefox
 * hands the URL to it and the new process exits; otherwise this starts the
 * profile. (Launching through `open -n` instead starts a second copy that
 * doesn't hand the URL over.) Rejects if Firefox can't be started.
 */
export function openInProfile(
  profilePath: string,
  url: string | undefined,
  executablePath: string | null,
  run: typeof spawn = spawn
): Promise<void> {
  if (!executablePath) return Promise.reject(new Error("Firefox couldn't be found. Is it installed?"));
  return new Promise((resolvePromise, reject) => {
    const child = run(executablePath, ["--profile", profilePath, ...(url ? [url] : [])], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolvePromise();
    });
  });
}

/** How often open commands re-check which profiles need setup. */
export const SETUP_RECHECK_MS = 15000;

/** Whether two setup checks found the same thing, so the list needn't re-render. */
export function sameSetup(
  a: { statuses: ProfileStatus[]; profiles: unknown[] },
  b: { statuses: ProfileStatus[]; profiles: unknown[] }
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
