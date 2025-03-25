import { Clipboard, closeMainWindow, popToRoot, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { runAppleScript } from "@raycast/utils";
import Style = Toast.Style;

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      const res = await runAppleScript(
        `
        on run argv
          tell application "Drafts"
            make new draft with properties {content: item 1 of argv, flagged: false}
          end tell
        end run
        `,
        [clipboardText]
      );
      await showHUD("Created Draft 👍", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
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
