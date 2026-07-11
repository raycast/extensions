import { closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const POSITRON_APP_NAME = "Positron";

/**
 * Check if Positron is running
 */
const isPositronRunning = async (): Promise<boolean> => {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return (name of processes) contains "${POSITRON_APP_NAME}"
      end tell
    `);
    return result.trim() === "true";
  } catch {
    return false;
  }
};

/**
 * Open a new window by using the File menu or launching Positron if not running.
 */
const makeNewWindow = async () => {
  const isRunning = await isPositronRunning();

  if (isRunning) {
    // If Positron is already running, use keyboard shortcut for New Window
    // This might bypass some session restoration behavior
    await runAppleScript(`
      tell application "System Events"
        tell process "${POSITRON_APP_NAME}"
          set frontmost to true
          delay 0.2
          key code 45 using {command down, shift down} -- Cmd+Shift+N for New Window
        end tell
      end tell
    `);
  } else {
    // If Positron is not running, launch it with a clean state
    // Use -n flag to open a new instance
    await runAppleScript(`
      do shell script "open -n -a '${POSITRON_APP_NAME}'"
    `);
  }
};

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open new Positron window" });
  }
}
