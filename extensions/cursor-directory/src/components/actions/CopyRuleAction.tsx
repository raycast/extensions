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
  open,
} from "@raycast/api";
import { CursorRule } from "../../types";
import { crossLaunchCommand } from "raycast-cross-extension";

interface Props {
  cursorRule: CursorRule;
}

export const CopyRuleAction = ({ cursorRule }: Props) => {
  const preferences = getPreferenceValues<Preferences>();

  async function copyAndApplyRule() {
    try {
      await Clipboard.copy(cursorRule.content);
      await showSuccessToast();

      if (await shouldOpenProject()) {
        await openProject();
      }
    } catch (error) {
      console.debug("Failed to copy and apply rule:", error);
      await showErrorToast();
    }
  }

  async function showSuccessToast() {
    await showToast({
      style: Toast.Style.Success,
      title: "Rule Copied",
      message: "Ready to paste into .cursorrules file",
    });
  }

  async function showErrorToast() {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to copy and apply rule",
    });
  }

  async function shouldOpenProject(): Promise<boolean> {
    if (preferences.skipConfirmationOnCopy) return true;

    return await confirmAlert({
      title: "Open Projects",
      message: "Do you want to open projects to apply this rule?",
      primaryAction: { title: "Open" },
      dismissAction: {
        title: "Cancel",
        onAction: () => showHUD("Paste into .cursorrules file in your project"),
      },
    });
  }

  async function openProject() {
    const context = {
      cursorDirectory: {
        ruleName: `${cursorRule.slug}.md`,
        ruleContent: cursorRule.content,
        replace: preferences.replaceOnLaunch,
      },
    };

    if (preferences.projectsDirectory) {
      try {
        await launchCommand({ name: "projects", type: LaunchType.UserInitiated, context });
      } catch (error) {
        console.debug("Failed to launch projects command:", error);
        await launchCursorRecentProjects(context);
      }
    } else {
      await launchCursorRecentProjects(context);
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

async function launchCursorRecentProjects(context: { cursorDirectory: { ruleContent: string; replace: boolean } }) {
  try {
    await crossLaunchCommand(
      {
        name: "index",
        extensionName: "cursor-recent-projects",
        ownerOrAuthorName: "degouville",
        type: LaunchType.UserInitiated,
        context,
      },
      // TODO: callbackLaunchOptions
    );
  } catch (error) {
    console.debug("Failed to launch cursor recent projects:", error);
    const shouldInstall = await confirmAlert({
      title: "Cursor Recent Projects Not Found",
      message: "Would you like to install it for easier project selection?",
      primaryAction: { title: "Install" },
      dismissAction: {
        title: "Cancel",
        onAction: () => showHUD("Paste into .cursorrules file in your project"),
      },
    });
    if (shouldInstall) {
      open("raycast://extensions/degouville/cursor-recent-projects");
    }
  }
}
