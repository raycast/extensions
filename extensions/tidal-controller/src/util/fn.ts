import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";

export async function checkTidalRunning(): Promise<boolean> {
  try {
    const res = await runAppleScript(`
        tell application "System Events"
          if exists (processes where name is "TIDAL") then
            return "true"
          else
            return "false"
          end if
        end tell
      `);
    const isRunning = res.trim().toLowerCase() === "true";
    if (!isRunning) {
      await showHUD("Tidal: Not running ❌");
    }
    return isRunning;
  } catch (error) {
    console.error("Error checking if Tidal is running:", error);
    await showHUD("Tidal: Error checking if running ❌");
    return false;
  }
}

export async function runTidalCommand(fn: () => Promise<void>): Promise<void> {
  const tidalRunning = await checkTidalRunning();
  if (tidalRunning) {
    await fn();
  }
}

interface Preferences {
  showMessages: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function showMessage(message: string) {
  if (getPreferences().showMessages) {
    showHUD(message);
  }
}
