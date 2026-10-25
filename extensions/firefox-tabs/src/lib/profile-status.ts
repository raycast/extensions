import { execFile, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import type { FirefoxProfile } from "./profiles";

export const EXTENSION_ID = "raycast-firefox@lau.engineering";

const FIREFOX_BINARY = "/Applications/Firefox.app/Contents/MacOS/firefox";

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

/**
 * Open `url` in a specific Firefox profile. If that profile is already
 * running, Firefox hands the URL to it; otherwise this starts it.
 */
export function openInProfile(profilePath: string, url?: string, run: typeof spawn = spawn): void {
  const args = ["--profile", profilePath, ...(url ? [url] : [])];
  run(FIREFOX_BINARY, args, { detached: true, stdio: "ignore" }).unref();
}
