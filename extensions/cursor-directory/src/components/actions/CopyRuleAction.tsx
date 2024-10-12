import {
  Action,
  Toast,
  showToast,
  Clipboard,
  Icon,
  confirmAlert,
  showHUD,
  Keyboard,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { CursorRule } from "../../types";

interface Props {
  cursorRule: CursorRule;
}

export const CopyRuleAction = ({ cursorRule }: Props) => {
  async function copyAndApplyRule() {
    await Clipboard.copy(cursorRule.content);

    await showToast({
      style: Toast.Style.Success,
      title: "Rule Copied",
      message: "Ready to paste into .cursorrules file",
    });

    let shouldLaunch = getPreferenceValues<Preferences>().skipConfirmationOnCopy;
    if (!shouldLaunch) {
      shouldLaunch = await confirmAlert({
        title: "Open Projects",
        message: "Do you want to open projects to apply this rule?",
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
      await launchCommand({
        name: "projects",
        type: LaunchType.UserInitiated,
        context: {
          ruleContent: cursorRule.content,
          replace: getPreferenceValues<Preferences>().replaceOnLaunch,
        },
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
