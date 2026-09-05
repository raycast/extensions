import { closeMainWindow, open, showHUD } from "@raycast/api";

/**
 * Triggers a Capso action via its native URL scheme (e.g. `capso://grab/area`).
 * Requires "Automation URLs" to be enabled in Capso Preferences -> General -> Automation.
 */
export async function triggerCapsoAction(url: string, label: string) {
  try {
    await closeMainWindow();
    await open(url);
  } catch (error) {
    await showHUD(`❌ Failed to trigger ${label}`);
    console.error(error);
  }
}
