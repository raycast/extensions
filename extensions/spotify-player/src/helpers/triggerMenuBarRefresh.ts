import { launchCommand, LaunchType } from "@raycast/api";
import { debounce } from "./debounce";
import isMenuBarAvailable from "./isMenuBarAvailable";

async function doTriggerMenuBarRefresh(): Promise<boolean> {
  if (!isMenuBarAvailable()) {
    return false;
  }

  try {
    await launchCommand({ name: "nowPlayingMenuBar", type: LaunchType.Background });
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("must be activated") || error.message.includes("No enabled command"))
    ) {
      // Menu bar command exists but user hasn't enabled it - not an error
      return false;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Triggers a refresh of the menu bar command in background.
 * Debounced to 5 seconds to prevent rapid successive refreshes.
 */
export const triggerMenuBarRefresh = debounce(doTriggerMenuBarRefresh, 5000);
