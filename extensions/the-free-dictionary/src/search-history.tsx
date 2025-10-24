import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  LocalStorage,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface HistoryItem {
  word: string;
  timestamp: number;
}

export default function Command() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const historyData = await LocalStorage.getItem<string>("search-history");
        if (historyData) {
          const parsed = JSON.parse(historyData) as HistoryItem[];
          setHistory(parsed.sort((a, b) => b.timestamp - a.timestamp));
        }
      } catch {
        await showToast(Toast.Style.Failure, "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  async function handleSearch(word: string) {
    try {
      await open(`https://tfd.com/${encodeURIComponent(word)}`);
      await closeMainWindow();
      await popToRoot();
    } catch {
      await showToast(Toast.Style.Failure, "Unable to open dictionary");
    }
  }

  async function handleClearHistory() {
    try {
      await LocalStorage.removeItem("search-history");
      setHistory([]);
      await showToast(Toast.Style.Success, "History cleared");
    } catch {
      await showToast(Toast.Style.Failure, "Failed to clear history");
    }
  }

  async function handleDeleteItem(word: string, timestamp: number) {
    try {
      const newHistory = history.filter((item) => !(item.word === word && item.timestamp === timestamp));
      await LocalStorage.setItem("search-history", JSON.stringify(newHistory));
      setHistory(newHistory);
      await showToast(Toast.Style.Success, "Item removed");
    } catch {
      await showToast(Toast.Style.Failure, "Failed to remove item");
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history...">
      {history.length === 0 ? (
        <List.EmptyView title="No search history" description="Your searched words will appear here" icon={Icon.Book} />
      ) : (
        history.map((item, index) => (
          <List.Item
            key={`${item.word}-${item.timestamp}-${index}`}
            title={item.word}
            subtitle={formatDate(item.timestamp)}
            icon={Icon.Text}
            actions={
              <ActionPanel>
                <Action title="Search Again" icon={Icon.MagnifyingGlass} onAction={() => handleSearch(item.word)} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDeleteItem(item.word, item.timestamp)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={handleClearHistory}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
