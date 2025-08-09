import { showHUD, closeMainWindow } from "@raycast/api";
import { cometBrowser } from "../lib/comet";
import { handleError } from "../lib/utils";

export default async function NewTab() {
  try {
    // Check if Comet is running
    const isRunning = await cometBrowser.isCometRunning();
    if (!isRunning) {
      throw new Error("Comet browser is not running");
    }

    // Open a new tab
    await cometBrowser.openNewTab();

    // Close Raycast window
    await closeMainWindow();

    // Show success HUD
    await showHUD("New tab opened in Comet");
  } catch (error) {
    await handleError(error, "opening new tab");
  }
}
