import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHistory, clearHistory, removeFromHistory, HistoryEntry } from "./history-storage";

export default function HistoryCommand() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    const items = await getHistory();
    setHistory(items);
    setIsLoading(false);
  }

  async function handleClearHistory() {
    await clearHistory();
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
    setHistory([]);
  }

  async function handleRemoveEntry(url: string) {
    await removeFromHistory(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Entry removed",
    });
    setHistory((prev) => prev.filter((item) => item.url !== url));
  }

  return (
    <List isLoading={isLoading} navigationTitle="Send to Kindle History">
      {history.length === 0 ? (
        <List.EmptyView title="No history found" description="Articles you send to Kindle will appear here." />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.url}
            title={item.title}
            subtitle={new Date(item.timestamp).toLocaleString()}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                <ActionPanel.Section>
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleRemoveEntry(item.url)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={handleClearHistory}
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
