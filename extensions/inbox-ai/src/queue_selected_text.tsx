import { LaunchProps, getSelectedText, showToast, Toast, open } from "@raycast/api";
import ActionList from "./components/ActionList";
import { SavedAction } from "./actions";
import { checkInboxAIInstallation } from "./utils/checkInstall";

interface CommandContext {
  actionId?: string;
  originalInput?: string;
}

export default function Command(props: LaunchProps<{ launchContext: CommandContext }>) {
  checkInboxAIInstallation();
  const handleActionSelect = async (action: SavedAction) => {
    try {
      const selectedText = await getSelectedText().catch(() => null);
      if (!selectedText) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Text Selected",
          message: "Please select some text first",
        });
        return false;
      }

      const url = `inboxai://queue?action=${encodeURIComponent(action.id)}&originalInput=${encodeURIComponent(selectedText)}`;
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
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to get selected text",
      });
      return false;
    }
  };

  return (
    <ActionList
      commandName="queue_selected_text"
      supportedTypes={["askAI", "realtimeAI"]}
      urlScheme="queue"
      launchContext={props.launchContext}
      onActionSelect={handleActionSelect}
    />
  );
}

// Add this at the top level of the file to help with debugging
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
