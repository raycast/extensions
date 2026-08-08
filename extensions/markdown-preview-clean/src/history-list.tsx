import { useCallback, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearHistory, getHistory, HistoryItem, removeFromHistory } from "./history";
import { MarkdownPreview } from "./markdown-preview";

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function previewSubtitle(markdown: string): string {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines
    .slice(1)
    .join(" ")
    .replace(/[*_`#>-]/g, "")
    .trim();
  if (!body) return `${markdown.length} chars`;
  return body.length > 80 ? `${body.slice(0, 77)}...` : body;
}

export default function Command() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = useCachedPromise(getHistory, [], {
    keepPreviousData: true,
  });
  const [searchText, setSearchText] = useState("");

  const items = data ?? [];
  const filtered = searchText
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchText.toLowerCase()) ||
          item.markdown.toLowerCase().includes(searchText.toLowerCase()),
      )
    : items;

  const openPreview = useCallback(
    (item: HistoryItem) => {
      // saveHistory=true bumps the item to the top when re-opened
      push(
        <MarkdownPreview
          markdown={item.markdown}
          backTitle="Back to History"
          saveHistory={true}
          navigationTitle="Markdown Preview"
        />,
      );
      // refresh when user is likely to return (best-effort; List remounts revalidate via cache TTL)
      setTimeout(() => {
        void revalidate();
      }, 300);
    },
    [push, revalidate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removeFromHistory(id);
      await revalidate();
      showToast({ style: Toast.Style.Success, title: "Removed from history" });
    },
    [revalidate],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear all history?",
      message: "This cannot be undone.",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearHistory();
    await revalidate();
    showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, [revalidate]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title={items.length === 0 ? "No history yet" : "No matches"}
          description={
            items.length === 0 ? "Preview some Markdown first — it will show up here." : "Try a different search term."
          }
        />
      ) : (
        filtered.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Document}
            title={item.title}
            subtitle={previewSubtitle(item.markdown)}
            accessories={[{ text: formatRelativeTime(item.createdAt) }]}
            actions={
              <ActionPanel>
                <Action title="Preview" icon={Icon.Eye} onAction={() => openPreview(item)} />
                <Action.CopyToClipboard
                  title="Copy Markdown"
                  content={item.markdown}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(item.id)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
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
