import os from "os";

export const scriptForVentura = `
  tell application "System Settings"
  activate
  end tell
  delay 0.1

  tell application "System Events"
  tell process "System Settings"
      click menu item "Trackpad" of menu "View" of menu bar 1
      delay 0.25
      click radio button 2 of tab group 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
      click checkbox "Natural scrolling" of group 1 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
      tell application "System Settings" to quit
  end tell
  end tell
return 1
`;

export const scriptForOtherVersions = `
  tell application "System Preferences"
    reveal anchor "trackpadTab" of pane id "com.apple.preference.trackpad"
  end tell
  tell application "System Events" to tell process "System Preferences"
    click checkbox 1 of tab group 1 of window 0
  end tell
  quit application "System Preferences"
  return 1
`;

/**
 * @description Utility method to fetch return different appleScripts for different MacOS versions
 * @note Using native `os` module to get the macOS version. The link below has the release history
 * @link https://en.wikipedia.org/wiki/Darwin_%28operating_system%29#Release_history
 * @returns {string} The appleScript that is needed in a template format
 */
export function fetchAppleScript(): string {
  try {
    // Output of `os.release()` would look like `22.3.0` (Depends on your macOS version)
    const version = Number(os.release().split(".")[0]);
    // 22 or above refers to MacOS Ventura.
    if (version < 22) {
      return scriptForOtherVersions;
    }
    return scriptForVentura;
  } catch (error) {
    console.error(`Error while checking & parsing system versions ... ${error}`);
    throw error;
  }
}
