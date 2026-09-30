import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";
import { LanguageCode, getMenuOptionsByLanguage, MenuOptions } from "./lang";

export async function checkTidalRunning(options?: { silent?: boolean }): Promise<boolean> {
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
    if (!isRunning && !options?.silent) {
      await showHUD("Tidal: Not running ❌");
    }
    return isRunning;
  } catch (error) {
    console.error("Error checking if Tidal is running:", error);
    if (!options?.silent) {
      await showHUD("Tidal: Error checking if running ❌");
    }
    return false;
  }
}

export async function runTidalCommand(fn: () => Promise<void>, options?: { silent?: boolean }): Promise<void> {
  const tidalRunning = await checkTidalRunning(options);
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

export async function getNowPlaying(): Promise<{ full: string; formatted: string; short: string }> {
  /*
    This script hits an error when it can't get the name of the window --
    this is often due to the window being (closed as opposed to being minimized)
    since we have to use AS to get the data & can only access what is available,
    there is no clear workaround for this use case.

    I return "TIDAL" (the default window name) and handle it the same as if it were
    paused or closed.
   */
  const songInfo = await runAppleScript(`
      tell application "System Events"
        try
        tell process "TIDAL"
          set windowTitle to name of window 1
          return windowTitle
        end tell
        on error
          return "TIDAL"
        end try
      end tell`);
  // the full single line song info
  const full = songInfo;
  // formatted returns a newline (\n) after the first space after the 40ch
  const formatted = songInfo.replace(/(.{40}\S*?)(\s+|$)/g, "$1\n");
  // get and set the short title -- trimmed to the first 20ch
  const short = songInfo.length > 20 ? songInfo.slice(0, 20) + "..." : songInfo;

  return { full, formatted, short };
}
