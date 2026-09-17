import { environment, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { join } from "node:path";
import { isPatched, reloadFinicky } from "./lib/config";

/**
 * Finicky does not watch files its config imports, so edits to the user's own config need a nudge.
 * Run by hand it always reloads. Run by Raycast in the background (see `interval` in package.json)
 * it stays silent and only acts when the user's config is newer than the entry, or when the
 * extension's folder has moved and the entry's glue import needs repairing.
 */
export default async function Command() {
  const gluePath = join(environment.assetsPath, "finickizer.js");
  if (environment.launchType === LaunchType.Background) {
    try {
      if (isPatched()) reloadFinicky({ onlyIfStale: true, gluePath });
    } catch {
      // Nothing useful to say from the background.
    }
    return;
  }
  try {
    reloadFinicky({ onlyIfStale: false, gluePath });
    await showHUD("Finicky config reloaded");
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not reload Finicky config", message: String(error) });
  }
}
