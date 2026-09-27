import { Application, closeMainWindow, getApplications, open, showHUD } from "@raycast/api";
import { readFile } from "fs/promises";

export const bundleID = "io.github.rbstp.heed";

/// Heed in a list the caller already has. Asked again per action rather than remembered: an
/// uninstall between opening the window list and picking from it has to be noticed.
export function findHeed(apps: Application[]): Application | undefined {
  return apps.find((app) => app.bundleId === bundleID);
}

/// The bundle's marketing version, read from its Info.plist: the app answers nothing over the URL,
/// so what it understands has to be known before asking.
async function version(app: Application): Promise<string | undefined> {
  const plist = await readFile(`${app.path}/Contents/Info.plist`, "utf8");
  return /<key>CFBundleShortVersionString<\/key>\s*<string>(\d+(?:\.\d+)*)<\/string>/.exec(plist)?.[1];
}

function older(version: string, than: string): boolean {
  const a = version.split(".").map(Number);
  const b = than.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/// Ask the running Heed for something. The vocabulary is Heed's own: `focus/next`, `toggle`.
///
/// One way only. Heed answers nothing back, so `hud` says what was asked for, never what came of
/// it. A URL to a Heed that is not running launches it, and its first answer can be to do nothing
/// while it works out where focus was. `since` is the Heed that learned the command; an older one
/// ignores it, and the HUD would otherwise claim it was done.
export async function tell(command: string, hud?: string, since?: string) {
  try {
    const heed = findHeed(await getApplications());
    if (!heed) {
      await showHUD("Heed is not installed");
      return;
    }
    if (since) {
      const installed = await version(heed);
      if (!installed || older(installed, since)) {
        await showHUD(`Needs Heed ${since} or later; ${installed ?? "an unknown version"} is installed`);
        return;
      }
    }

    // Before the URL, or Raycast's own window is what the pointer and the focus ring see.
    await closeMainWindow();
    await open(`heed://${command}`);
    if (hud) {
      await showHUD(hud);
    }
  } catch (error) {
    await showHUD(`Could not reach Heed: ${error instanceof Error ? error.message : error}`);
  }
}
