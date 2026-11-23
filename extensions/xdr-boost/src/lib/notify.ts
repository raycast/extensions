import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { log } from "./log";

// The text travels as argv to the AppleScript `run` handler, never interpolated into the script,
// so display names or any other text cannot inject AppleScript.
const SCRIPT = "on run {t, m}\ndisplay notification m with title t\nend run";

/**
 * Posts a macOS notification when the `notifyOnChange` preference is on. Never throws:
 * a missing or suppressed notification must not turn a successful change into a failure.
 */
export async function notify(message: string): Promise<void> {
  if (!getPreferenceValues<Preferences>().notifyOnChange) return;
  try {
    await runAppleScript(SCRIPT, ["XDR Boost", message], { timeout: 5000 });
  } catch (error) {
    log("notification failed", { message: error instanceof Error ? error.message : String(error) });
  }
}
