import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getHistory,
  deleteHistoryItem,
  clearHistory,
  HistoryItem,
} from "./history";

export default function ViewHistoryCommand() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadHistory() {
    setIsLoading(true);
    const items = await getHistory();
    setHistory(items);
    setIsLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleCopyEnhanced(item: HistoryItem) {
    await Clipboard.copy(item.enhancedPrompt);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied enhanced prompt",
    });
  }

  async function handleCopyOriginal(item: HistoryItem) {
    await Clipboard.copy(item.originalPrompt);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied original prompt",
    });
  }

  async function handleDelete(id: string) {
    await deleteHistoryItem(id);
    await loadHistory();
    await showToast({
      style: Toast.Style.Success,
      title: "Item deleted",
    });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message:
        "This will delete all saved prompts. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
      await loadHistory();
      await showToast({
        style: Toast.Style.Success,
        title: "History cleared",
      });
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history...">
      {history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No History Yet"
          description="Enhanced prompts will appear here"
        />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Document}
            title={truncate(item.originalPrompt, 60)}
            subtitle={item.provider}
            accessories={[
              { text: item.model, icon: Icon.ComputerChip },
              { text: formatDate(item.timestamp), icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Enhanced Prompt"
                    icon={Icon.Clipboard}
                    onAction={() => handleCopyEnhanced(item)}
                  />
                  <Action
                    title="Copy Original Prompt"
                    icon={Icon.Document}
                    onAction={() => handleCopyOriginal(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(item.id)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={handleClearAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
