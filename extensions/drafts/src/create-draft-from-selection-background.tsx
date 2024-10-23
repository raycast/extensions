import { getSelectedText, showToast, Toast, PopToRootType, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

export default async function () {
  if (await checkAppInstallation()) {
    try {
      const selectedText = await getSelectedText();
      const res = await runAppleScript(
        `
        on run argv
          tell application "Drafts"
            make new draft with properties {content: item 1 of argv, flagged: false}
          end tell
        end run
        `,
        [selectedText]
      );
      await showHUD("Created Draft 👍", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "no text selected",
        message: String(error),
      });
    }
  }
}
/*
tell application "Drafts"
    make new draft with properties {content: "My Draft Content", flagged: false, tags: {"blue", "green"}}
end tell
*/
