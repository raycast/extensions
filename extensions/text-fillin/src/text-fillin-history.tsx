import {
  Alert,
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { HISTORY_STORAGE_KEY, HistoryItem, loadHistory } from "./history";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory().then((items) => {
      setHistory(items);
      setIsLoading(false);
    });
  }, []);

  const filteredHistory = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return history;
    }
    return history.filter((item) => item.text.toLowerCase().includes(keyword));
  }, [history, searchText]);

  const pasteItem = async (item: HistoryItem) => {
    try {
      await closeMainWindow();
      await Clipboard.paste(item.text);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste from history",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const removeItem = async (id: string) => {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  };

  const clearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear all history?",
      message: "This will remove every saved text entry.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    setHistory([]);
    await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredHistory.map((item) => (
        <List.Item
          key={item.id}
          title={firstLine(item.text)}
          subtitle={formatTimestamp(item.createdAt)}
          icon={{ source: Icon.TextDocument, tintColor: Color.Blue }}
          accessories={[{ text: `${item.text.length} chars` }]}
          actions={
            <ActionPanel>
              <Action
                title="Paste Text"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => pasteItem(item)}
              />
              <Action.CopyToClipboard title="Copy Text" content={item.text} />
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => removeItem(item.id)}
              />
              <Action
                title="Clear All History"
                icon={Icon.ExclamationMark}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={clearHistory}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && filteredHistory.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No matching results" : "No history yet"}
          description={
            searchText
              ? "Try a different keyword."
              : "Submit text from Text Fillin to start building history."
          }
          icon={Icon.Text}
        />
      ) : null}
    </List>
  );
}

function firstLine(text: string) {
  const line = text.split("\n")[0] ?? "";
  return line.trim() || "(blank)";
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}
