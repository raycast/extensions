import { closeMainWindow, getApplications, getSelectedFinderItems, open, showHUD } from "@raycast/api";

const BUNDLE_ID = "io.github.houseofmackee.cleanshotz";

/**
 * Runs a CleanShotZ command through its URL scheme, for example
 * `cleanshotz://capture-area`. See the CleanShotZ README for every command
 * and its parameters. Failures are shown in a HUD (the commands have no
 * view), never left uncaught.
 */
export async function run(command: string, parameters: Record<string, string> = {}) {
  try {
    const installed = await getApplications();
    if (!installed.some((app) => app.bundleId === BUNDLE_ID)) {
      await showHUD("CleanShotZ is not installed");
      return;
    }
    const query = new URLSearchParams(parameters).toString();
    const url = `cleanshotz://${command}${query ? `?${query}` : ""}`;
    await closeMainWindow();
    await open(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await showHUD(`Could not open CleanShotZ: ${reason}`);
  }
}

/** Runs `command` with the file selected in Finder as `filepath`. */
export async function runOnSelection(command: string, parameters: Record<string, string> = {}) {
  let path: string | undefined;
  try {
    path = (await getSelectedFinderItems())[0]?.path;
  } catch {
    path = undefined;
  }
  if (!path) {
    await showHUD("Select an image in Finder first");
    return;
  }
  await run(command, { ...parameters, filepath: path });
}
