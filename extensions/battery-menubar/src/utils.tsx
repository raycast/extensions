import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export const openBatterySettings = () => {
  open("x-apple.systempreferences:com.apple.preference.battery");
};

export const openActivityMonitor = () => {
  runAppleScript(`
      tell application "Activity Monitor"
        activate
      end tell
    `);
};

// open Displays settings
export const openScreenTimeSettings = () => {
  open("x-apple.systempreferences:com.apple.preference.displays");
};
