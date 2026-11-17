/**
 * Where Blip's engine listens, and how to start Blip when it isn't running.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

const MAC_BUNDLE_ID = "net.blip.macos";
const MAC_TEAM_GROUP = "AY8UB8KTUX.blip";
const WINDOWS_SOCKET_DIR = "net.blip.desktop";

/** Where Blip's engine listens, most likely first. */
function endpointCandidates(override?: string): string[] {
  if (override?.trim()) return [override.trim()];
  if (isMac) {
    return [join(homedir(), "Library", "Group Containers", MAC_TEAM_GROUP, "Library", "Caches", "sock")];
  }
  if (isWindows) {
    // Verified with Blip 1.2.8 (Microsoft Store app): a Unix-domain socket in the user's temp folder.
    const localTemp = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Temp");
    return [...new Set([tmpdir(), localTemp])].map((dir) => join(dir, WINDOWS_SOCKET_DIR, "sock"));
  }
  return [];
}

/** The first candidate that exists, else the most likely one (Blip may not have started yet). */
export function resolveEndpoint(override?: string): string | undefined {
  const candidates = endpointCandidates(override ?? process.env.BLIP_ENDPOINT);
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

/** Blip's Microsoft Store package; its app ID is stable across versions. */
const WINDOWS_PACKAGE_FAMILY = "BlipStudioInc.BlipApp_eydxbjyejh39j";
const WINDOWS_APP_ID = `${WINDOWS_PACKAGE_FAMILY}!Blip`;

async function startBlip({ background }: { background: boolean }): Promise<void> {
  if (isMac) {
    await execFileAsync("/usr/bin/open", background ? ["-g", "-b", MAC_BUNDLE_ID] : ["-b", MAC_BUNDLE_ID]);
  } else if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    if (!existsSync(join(localAppData, "Packages", WINDOWS_PACKAGE_FAMILY))) throw new Error("Blip isn't installed.");
    // Explorer starts Store apps by ID; it exits with code 1 even on success, so its exit code is ignored.
    await execFileAsync("explorer.exe", [`shell:AppsFolder\\${WINDOWS_APP_ID}`]).catch(() => {});
  }
}

/** Starts Blip without bringing it to the front (on Windows, Blip decides whether to show its window). */
export const launchBlipInBackground = () => startBlip({ background: true });

/** Opens Blip's window, wherever Blip is installed. */
export const openBlip = () => startBlip({ background: false });
