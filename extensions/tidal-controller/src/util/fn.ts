import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";
import { LanguageCode, getMenuOptionsByLanguage, MenuOptions } from "./lang";

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
    try {
      await fn();
    } catch (err) {
      console.error("Error running Tidal command:", err);
      await showHUD("Tidal: Error running command! ❌\nDid you choose the right language in your settings?");
    }
  }
}

interface Preferences {
  showMessages: boolean;
  language: LanguageCode;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getMenuOptions(): MenuOptions {
  return getMenuOptionsByLanguage(getPreferences().language);
}

export function showMessage(message: string) {
  if (getPreferences().showMessages) {
    showHUD(message);
  }
}
