import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { buildTranslationDetailMarkdown } from "./lib/markdown";
import { clearHistory, deleteTranslation, getHistory } from "./lib/storage";
import { Translation } from "./lib/types";

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function History() {
  const [history, setHistory] = useState<Translation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    getHistory().then((h) => {
      setHistory(h);
      setIsLoading(false);
    });
  }, []);

  const filtered = searchText
    ? history.filter(
        (t) =>
          t.word.toLowerCase().includes(searchText.toLowerCase()) ||
          t.translation.toLowerCase().includes(searchText.toLowerCase()),
      )
    : history;

  async function handleDelete(id: string) {
    const confirmed = await confirmAlert({
      title: "Delete Translation",
      message: "Remove this entry from your history?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const deleted = await deleteTranslation(id);
    if (!deleted) {
      await showToast({
        style: Toast.Style.Failure,
        title: "History storage is corrupted",
        message: "Delete skipped to avoid overwriting existing data.",
      });
      return;
    }

    setHistory((prev) => prev.filter((t) => t.id !== id));
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all saved translations.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await clearHistory();
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search translations..."
      onSearchTextChange={setSearchText}
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No translations yet"
          description="Use Translate Word to get started"
        />
      ) : (
        filtered.map((item) => (
          <List.Item
            key={item.id}
            title={item.word}
            subtitle={isShowingDetail ? undefined : item.translation}
            accessories={[
              { tag: { value: item.partOfSpeech, color: Color.Blue } },
              { text: relativeTime(item.timestamp) },
            ]}
            detail={
              <List.Item.Detail
                markdown={buildTranslationDetailMarkdown(item)}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                  icon={Icon.Sidebar}
                  onAction={() => setIsShowingDetail((v) => !v)}
                />
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={item.translation}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDelete(item.id)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
