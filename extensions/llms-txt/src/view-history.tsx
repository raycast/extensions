import { ActionPanel, Action, List, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { getHistory, removeFromHistory, formatTimestamp } from "./storage";
import type { HistoryEntry, ActionType } from "./types";
import { handleWebsiteAction } from "./utils";
import { showFailureToast, usePromise } from "@raycast/utils";

export default function ViewHistory() {
  const {
    isLoading,
    data: history = [],
    mutate,
  } = usePromise(getHistory, [], {
    failureToastOptions: {
      title: "Failed to load history",
    },
  });

  async function handleRemove(entry: HistoryEntry) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing from history",
    });
    try {
      await mutate(removeFromHistory(entry), {
        optimisticUpdate(data) {
          return (data || []).filter((e) => !(e.website.url === entry.website.url && e.timestamp === entry.timestamp));
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Removed from history";
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to remove entry",
      });
    }
  }

  function getActionIcon(action: ActionType): Icon {
    switch (action) {
      case "view_llms":
      case "view_llms_full":
        return Icon.Eye;
      case "copy_llms":
      case "copy_llms_full":
        return Icon.Clipboard;
      default:
        return Icon.Circle;
    }
  }

  function getActionTitle(action: ActionType): string {
    switch (action) {
      case "view_llms":
        return "Viewed llms.txt";
      case "view_llms_full":
        return "Viewed llms-full.txt";
      case "copy_llms":
        return "Copied llms.txt URL";
      case "copy_llms_full":
        return "Copied llms-full.txt URL";
      default:
        return "Unknown action";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history...">
      {history.map((entry) => (
        <List.Item
          key={`${entry.website.url}-${entry.timestamp}`}
          title={entry.website.name}
          subtitle={getActionTitle(entry.action)}
          accessories={[{ text: formatTimestamp(entry.timestamp) }]}
          icon={getActionIcon(entry.action)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Repeat Action"
                  icon={getActionIcon(entry.action)}
                  onAction={() => handleWebsiteAction(entry.website, entry.action)}
                />
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleRemove(entry)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No History Yet"
        description="Your llms.txt viewing and copying actions will appear here. Use the extension to view or copy llms.txt files to start building your history."
        icon={Icon.Clock}
      />
    </List>
  );
}
