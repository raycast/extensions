import { FileSystemItem, closeMainWindow } from "@raycast/api";
import path from "path";
import { runAppleScript } from "run-applescript";

export function isValidFile(file: FileSystemItem) {
  const extname = path.extname(file.path).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".heic"].includes(extname);
}
/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

export function applyWallpaperUpdate(file: string) {
  return runAppleScriptSilently(`
    tell application "System Events"
      tell appearance preferences
        tell application "System Events"
          tell every desktop
            set picture to "${file}"
          end tell
        end tell
      end tell
    end tell
  `);
}
