/**
 * Where Blip's engine listens, and how to start Blip when it isn't running.
 */
import { execFile } from "node:child_process";
import { existsSync, readdirSync, type Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

const MAC_BUNDLE_ID = "net.blip.macos";
const MAC_TEAM_GROUP = "AY8UB8KTUX.blip";

/** Candidate endpoints, most likely first. A Windows path may be a named pipe (\\.\pipe\…). */
function endpointCandidates(override?: string): string[] {
  if (override?.trim()) return [override.trim()];
  if (isMac) {
    return [join(homedir(), "Library", "Group Containers", MAC_TEAM_GROUP, "Library", "Caches", "sock")];
  }
  if (isWindows) {
    return windowsCandidates();
  }
  return [];
}

let windowsFound: string[] | undefined;

/** Finds `sock` files under Blip's folders, a few levels deep. */
function findSocketFiles(dir: string, depth: number, out: string[]) {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0) findSocketFiles(path, depth - 1, out);
    } else if (entry.name === "sock" || entry.name.endsWith(".sock")) {
      out.push(path);
    }
  }
}

/**
 * Blip on Windows is not verified yet, so look for it rather than assume: named pipes with "blip"
 * in the name, then socket files inside Blip's app-data folders (including Store app containers).
 */
function windowsCandidates(): string[] {
  if (windowsFound?.length) return windowsFound;
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  const found: string[] = [];
  try {
    for (const name of readdirSync("\\\\.\\pipe\\")) {
      if (/blip/i.test(name)) found.push(`\\\\.\\pipe\\${name}`);
    }
  } catch {
    // Pipe listing unavailable; fall through to files.
  }
  for (const root of [join(localAppData, "Packages"), localAppData, appData]) {
    let names: string[] = [];
    try {
      names = readdirSync(root).filter((name) => /blip/i.test(name));
    } catch {
      continue;
    }
    for (const name of names) findSocketFiles(join(root, name), 5, found);
  }
  windowsFound = found;
  return found.length ? found : [join(localAppData, "Blip", "sock")];
}

function isNamedPipe(path: string) {
  return path.startsWith("\\\\.\\pipe\\");
}

/** First candidate that exists on disk (named pipes can't be stat'ed, so they're tried last as-is). */
export function resolveEndpoint(override?: string): string | undefined {
  const candidates = endpointCandidates(override ?? process.env.BLIP_ENDPOINT);
  const found = candidates.find((path) => isNamedPipe(path) || existsSync(path));
  if (!found) forgetEndpoint(); // Blip may not have started yet; search again next time.
  return found ?? candidates[0];
}

/** Search for Blip's endpoint again on the next call (e.g. after Blip restarts). */
export function forgetEndpoint() {
  windowsFound = undefined;
}

/**
 * Node can only open named pipes on Windows, not Unix-domain socket files. If Blip turns out to
 * listen on a socket file there, say so plainly instead of reporting "Blip isn't running".
 */
export function isUnsupportedWindowsSocket(path: string) {
  return isWindows && !isNamedPipe(path) && existsSync(path);
}

const startBlipOnWindows = (windowStyle: "Minimized" | "Normal") =>
  `$app = Get-StartApps | Where-Object { $_.Name -eq 'Blip' } | Select-Object -First 1; ` +
  `if ($app) { Start-Process ('shell:AppsFolder\\' + $app.AppID) -WindowStyle ${windowStyle} } else { throw 'blip_not_installed' }`;

async function startBlip({ background }: { background: boolean }): Promise<void> {
  if (isMac) {
    await execFileAsync("/usr/bin/open", background ? ["-g", "-b", MAC_BUNDLE_ID] : ["-b", MAC_BUNDLE_ID]);
  } else if (isWindows) {
    // Blip is started through its registered app entry, so the install location doesn't matter.
    await execFileAsync(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", startBlipOnWindows(background ? "Minimized" : "Normal")],
      { timeout: 10000 },
    );
  }
}

/** Starts Blip without bringing it to the front. */
export const launchBlipInBackground = () => startBlip({ background: true });

/** Opens Blip's window, wherever Blip is installed. */
export const openBlip = () => startBlip({ background: false });
