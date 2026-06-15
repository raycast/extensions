import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getItems,
  setRead,
  hostname,
  relativeDate,
  ReadLaterItem,
} from "./api";

export default function Command() {
  const [items, setItems] = useState<ReadLaterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setIsLoading(true);
      const all = await getItems();
      const unread = all
        .filter((i) => !i.read)
        .sort((a, b) => b.savedAt - a.savedAt);
      setItems(unread);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function markRead(item: ReadLaterItem) {
    try {
      await setRead(item, true);
      await refresh();
      await showToast({ style: Toast.Style.Success, title: "Marked as read" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't reach Read This Later"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search unread articles..."
    >
      {items.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="Nothing unread"
          description="Save a page from your browser to see it here."
        />
      )}
      {items.map((item) => (
        <List.Item
          key={item.url}
          title={item.title}
          subtitle={hostname(item.url)}
          icon={getFavicon(item.url, { fallback: Icon.Bookmark })}
          accessories={[{ text: relativeDate(item.savedAt) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={item.url}
                onOpen={() => markRead(item)}
              />
              <Action
                title="Mark as Read"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => markRead(item)}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={item.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
