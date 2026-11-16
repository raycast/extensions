import { execFile } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";
import { log } from "./log";

// The text travels as argv to the AppleScript `run` handler, never interpolated into the script,
// so display names or any other text cannot inject AppleScript. Same mechanism as the Fetch
// extension's download notifications (@chrismessina/raycast-downloader).
const SCRIPT = "on run {t, m}\ndisplay notification m with title t\nend run";

/**
 * Posts a macOS notification when the `notifyOnChange` preference is on. Never throws:
 * a missing or suppressed notification must not turn a successful change into a failure.
 */
export async function notify(message: string): Promise<void> {
  if (!getPreferenceValues<Preferences>().notifyOnChange) return;
  await new Promise<void>((resolve) => {
    execFile("/usr/bin/osascript", ["-e", SCRIPT, "XDR Boost", message], { timeout: 5000 }, (error) => {
      if (error) log("notification failed", { message: error.message });
      resolve();
    });
  });
}
