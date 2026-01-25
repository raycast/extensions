import { launchCommand, LaunchType } from "@raycast/api";
import isMenuBarAvailable from "./isMenuBarAvailable";

/**
 * Triggers a refresh of the menu bar command in background.
 * Returns true if successful, false if not available or not activated.
 */
export async function triggerMenuBarRefresh(): Promise<boolean> {
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
