import { LaunchProps, showToast, Toast, BrowserExtension, open, Action, Icon } from "@raycast/api";
import ActionList from "./components/ActionList";
import { SavedAction } from "./actions";
import { checkInboxAIInstallation } from "./utils/checkInstall";
interface CommandContext {
  actionId?: string;
  originalInput?: string;
}

export default function Command(props: LaunchProps<{ launchContext: CommandContext }>) {
  checkInboxAIInstallation();
  const openInboxAI = async (url: string) => {
    try {
      await open(url);
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to launch Inbox AI. Is it installed?",
      });
      return false;
    }
  };

  const handleAction = async (action: SavedAction, urlOnly = false) => {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);

      if (!activeTab) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Active Tab",
          message: "Please make sure a webpage is active.",
        });
        return false;
      }

      const originalInput = urlOnly
        ? activeTab.url
        : JSON.stringify({
            title: activeTab.title,
            url: activeTab.url,
            content: await BrowserExtension.getContent({ format: "markdown" }),
          });

      if (!urlOnly && !originalInput) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Browser Content",
          message: "Please make sure the browser extension is installed and a webpage is active.",
        });
        return false;
      }

      return openInboxAI(
        `inboxai://queue?action=${encodeURIComponent(action.id)}&originalInput=${encodeURIComponent(originalInput)}`,
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to get browser ${urlOnly ? "tabs" : "content"}. Is the browser extension installed?`,
      });
      return false;
    }
  };

  return (
    <ActionList
      commandName="queue_browser_content"
      supportedTypes={["askAI", "realtimeAI"]}
      urlScheme="queue"
      launchContext={props.launchContext}
      onActionSelect={(action) => handleAction(action, false)}
      extraActions={(action) => [
        <Action
          key="url-only"
          icon={Icon.CommandSymbol}
          title="Trigger Action (url Only)"
          shortcut={{ modifiers: ["opt"], key: "enter" }}
          onAction={() => handleAction(action, true)}
        />,
      ]}
    />
  );
}

// Add this at the top level of the file to help with debugging
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
