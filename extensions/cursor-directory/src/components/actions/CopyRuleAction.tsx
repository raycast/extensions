import {
  Action,
  Toast,
  showToast,
  Clipboard,
  Icon,
  open,
  LaunchType,
  confirmAlert,
  showHUD,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { CursorRule } from "../../types";
import { crossLaunchCommand } from "raycast-cross-extension";

interface Props {
  cursorRule: CursorRule;
}

export const CopyRuleAction = ({ cursorRule }: Props) => {
  async function copyAndApplyRule() {
    try {
      await Clipboard.copy(cursorRule.content);

      await showToast({
        style: Toast.Style.Success,
        title: "Rule Copied",
        message: "Ready to paste into .cursorrules file",
      });

      try {
        let { autoLaunchRecentProjects: shouldLaunch } = getPreferenceValues<Preferences>();

        if (!shouldLaunch) {
          shouldLaunch = await confirmAlert({
            title: "Open Recent Projects",
            message: "Do you want to open the Cursor Recent Projects extension?",
            primaryAction: {
              title: "Open",
            },
            dismissAction: {
              title: "Cancel",
              onAction: () => {
                showHUD("Paste into .cursorrules file in your project");
              },
            },
          });
        }

        if (shouldLaunch) {
          await crossLaunchCommand({
            name: "index",
            type: LaunchType.UserInitiated,
            extensionName: "cursor-recent-projects",
            ownerOrAuthorName: "degouville",
          });
        }
      } catch (error) {
        const shouldInstall = await confirmAlert({
          title: "Cursor Recent Projects Not Found",
          message: "Would you like to install it for easier project selection?",
          primaryAction: {
            title: "Install",
          },
          dismissAction: {
            title: "Cancel",
            onAction: () => {
              showHUD("Paste into .cursorrules file in your project");
            },
          },
        });

        if (shouldInstall) {
          open("raycast://extensions/degouville/cursor-recent-projects");
        }
      }
    } catch (error) {
      console.error("Error copying rule:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to copy rule",
      });
    }
  }

  return (
    <Action
      title="Copy and Apply Rule"
      onAction={copyAndApplyRule}
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
};
