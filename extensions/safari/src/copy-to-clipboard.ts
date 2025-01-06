import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "./utils";

export default async function Command() {
  try {
    const currentURL = await runAppleScript(`
      tell application "${safariAppIdentifier}"
        set theURL to URL of current tab of window 1
        return theURL
      end tell
    `);
    await Clipboard.copy(currentURL);
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: "Copied URL to Clipboard",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy URL",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
