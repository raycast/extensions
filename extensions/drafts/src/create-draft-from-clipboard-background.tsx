import { Clipboard, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import Style = Toast.Style;
import { closeMainWindowAndShowSuccessToast } from "./utils/NotificationUtils";

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      try {
        await runAppleScript(
          `
        on run argv
          tell application "Drafts"
            make new draft with properties {content: item 1 of argv, flagged: false}
          end tell
        end run
        `,
          [clipboardText]
        );
        await closeMainWindowAndShowSuccessToast("Created Draft 👍");
      } catch (error) {
        await showFailureToast("Failed to create Draft");
        return;
      }
    } else {
      await showToast({
        style: Style.Failure,
        title: "Clipboard is empty",
      });
    }

    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
};
