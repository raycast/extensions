import { closeMainWindow } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import { openExtensionPreferences } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import * as fs from "fs";

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

export function wallpaperPathsAreValid(dark: string, light: string) {
  type File = [];
  const isValidFile = (file: string) => {
    return fs.lstatSync(file).isFile() && file.match(/\.(|jpe?g|png|heic)$/i);
  };

  if (!isValidFile(dark) || !isValidFile(light)) {
    return false;
  } else {
    return true;
  }
}

export async function showBadPathsFailureToast() {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: "Wrong filetype",
    message: "Use .png, .jpg, or .heic images",
    primaryAction: {
      title: "Open PaperMatch Preferences",
      onAction: (toast) => {
        toast.hide();
        openExtensionPreferences();
      },
    },
  };

  await showToast(options);
}
