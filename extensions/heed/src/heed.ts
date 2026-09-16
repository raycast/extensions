import { Application, closeMainWindow, getApplications, open, showHUD } from "@raycast/api";

export const bundleID = "io.github.rbstp.heed";

/// Heed in a list the caller already has. Asked again per action rather than remembered: an
/// uninstall between opening the window list and picking from it has to be noticed.
export function findHeed(apps: Application[]): Application | undefined {
  return apps.find((app) => app.bundleId === bundleID);
}

/// Ask the running Heed for something. The vocabulary is Heed's own: `focus/next`, `toggle`.
///
/// One way only. Heed answers nothing back, so `hud` says what was asked for, never what came of
/// it. A URL to a Heed that is not running launches it, and its first answer can be to do nothing
/// while it works out where focus was.
export async function tell(command: string, hud?: string) {
  try {
    if (!findHeed(await getApplications())) {
      await showHUD("Heed is not installed");
      return;
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
