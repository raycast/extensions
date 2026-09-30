import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "./utils";

export default async function Command() {
  try {
    await runAppleScript(`
      tell application "${safariAppIdentifier}"
        set theURL to URL of current tab of window 1
        add reading list item theURL
      end tell
    `);
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: "Added to Reading List",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to add to Reading List",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
