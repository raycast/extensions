/**
 * Where Blip's engine listens, and how to start Blip when it isn't running.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

export const MAC_BUNDLE_ID = "net.blip.macos";
const MAC_TEAM_GROUP = "AY8UB8KTUX.blip";

/** Candidate endpoints, most likely first. A Windows path may be a named pipe (\\.\pipe\…). */
export function endpointCandidates(override?: string): string[] {
  if (override?.trim()) return [override.trim()];
  if (isMac) {
    return [join(homedir(), "Library", "Group Containers", MAC_TEAM_GROUP, "Library", "Caches", "sock")];
  }
  if (isWindows) {
    return windowsCandidates();
  }
  return [];
}

function windowsCandidates(): string[] {
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  return [
    join(localAppData, "Blip", "sock"),
    join(localAppData, "Blip", "Caches", "sock"),
    join(appData, "Blip", "sock"),
    "\\\\.\\pipe\\blip",
  ];
}

export function isNamedPipe(path: string) {
  return path.startsWith("\\\\.\\pipe\\");
}

/** First candidate that exists on disk (named pipes can't be stat'ed, so they're tried last as-is). */
export function resolveEndpoint(override?: string): string | undefined {
  const candidates = endpointCandidates(override);
  return candidates.find((path) => isNamedPipe(path) || existsSync(path)) ?? candidates[0];
}

export async function launchBlipInBackground(): Promise<void> {
  if (isMac) {
    await execFileAsync("/usr/bin/open", ["-g", "-b", MAC_BUNDLE_ID]);
    return;
  }
  if (isWindows) {
    // Start Blip through its registered app entry without bringing it to front if possible.
    await execFileAsync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$app = Get-StartApps | Where-Object { $_.Name -eq 'Blip' } | Select-Object -First 1; if ($app) { Start-Process ('shell:AppsFolder\\' + $app.AppID) -WindowStyle Minimized } else { throw 'blip_not_installed' }",
      ],
      { timeout: 10000 },
    );
  }
}
