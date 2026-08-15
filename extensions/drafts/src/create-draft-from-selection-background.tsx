import { getSelectedText, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { closeMainWindowAndShowSuccessToast } from "./utils/NotificationUtils";

export default async function () {
  if (await checkAppInstallation()) {
    try {
      const selectedText = await getSelectedText();
      try {
        await runAppleScript(
          `
        on run argv
          tell application "Drafts"
            make new draft with properties {content: item 1 of argv, flagged: false}
          end tell
        end run
        `,
          [selectedText]
        );
        await closeMainWindowAndShowSuccessToast("Created Draft 👍");
      } catch (error) {
        await showFailureToast("Failed to create Draft");
        return;
      }
    } catch (error) {
      await showFailureToast("no text selected");
      await showToast({
        style: Toast.Style.Failure,
        title: "no text selected",
        message: String(error),
      });
    }
  }
}
