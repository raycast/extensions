import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getItems,
  setRead,
  setDeleted,
  deleteBody,
  hostname,
  relativeDate,
  groupByFolder,
  ReadLaterItem,
} from "./api";
import { Reader } from "./reader";

type Filter = "unread" | "read" | "all";

function matchesFilter(item: ReadLaterItem, filter: Filter): boolean {
  if (filter === "unread") return !item.read;
  if (filter === "read") return item.read;
  return true;
}

// Raycast can read captured bodies but can't create them — capture needs a
// live logged-in DOM, which only the browser extension and iOS app have.
function offlineAccessory(item: ReadLaterItem): List.Item.Accessory | null {
  switch (item.offline) {
    case "saved":
      return {
        icon: { source: Icon.Book, tintColor: Color.Green },
        tooltip: "Captured — press ⌘↵ to read here",
      };
    case "requested":
      return {
        icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
        tooltip: "Offline copy pending",
      };
    case "unavailable":
      return {
        icon: { source: Icon.Book, tintColor: Color.SecondaryText },
        tooltip: "No offline copy available (paywalled or unreadable)",
      };
    default:
      return null;
  }
}

function accessories(item: ReadLaterItem): List.Item.Accessory[] {
  const list: List.Item.Accessory[] = [];
  if (item.notes) {
    list.push({
      icon: { source: Icon.Pencil, tintColor: Color.Blue },
      tooltip: item.notes,
    });
  }
  const offline = offlineAccessory(item);
  if (offline) list.push(offline);
  list.push({ text: relativeDate(item.savedAt) });
  return list;
}

export default function Command() {
  const [items, setItems] = useState<ReadLaterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("unread");

  async function refresh() {
    try {
      setIsLoading(true);
      const all = await getItems();
      setItems(all.sort((a, b) => b.savedAt - a.savedAt));
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

  async function toggleRead(item: ReadLaterItem, read: boolean) {
    try {
      await setRead(item, read);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: read ? "Marked as read" : "Marked as unread",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function remove(item: ReadLaterItem) {
    const confirmed = await confirmAlert({
      title: "Delete this link?",
      message: `"${item.title}" will be removed from Research Sync on all your devices.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await setDeleted(item);
      if (item.offline === "saved") await deleteBody(item.url);
      await refresh();
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't reach Research Sync"
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

  const visible = items.filter((i) => matchesFilter(i, filter));
  const sections = groupByFolder(visible);

  function itemNode(item: ReadLaterItem) {
    return (
      <List.Item
        key={item.url}
        title={item.title}
        subtitle={hostname(item.url)}
        icon={getFavicon(item.url, { fallback: Icon.Bookmark })}
        accessories={accessories(item)}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={item.url}
              onOpen={() => {
                if (!item.read) toggleRead(item, true);
              }}
            />
            <Action.Push
              title={item.offline === "saved" ? "Read Article" : "Show Details"}
              icon={item.offline === "saved" ? Icon.Book : Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              target={<Reader item={item} />}
            />
            {item.read ? (
              <Action
                title="Mark as Unread"
                icon={Icon.Circle}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => toggleRead(item, false)}
              />
            ) : (
              <Action
                title="Mark as Read"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => toggleRead(item, true)}
              />
            )}
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
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => remove(item)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved articles..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        >
          <List.Dropdown.Item
            title="Unread"
            value="unread"
            icon={Icon.Circle}
          />
          <List.Dropdown.Item title="Read" value="read" icon={Icon.Check} />
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {visible.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title={
            filter === "read"
              ? "Nothing read yet"
              : filter === "all"
                ? "Nothing saved yet"
                : "Nothing unread"
          }
          description="Save a page from your browser to see it here."
        />
      )}
      {/* One folder? Then the classifier hasn't split anything up yet, and a
          lone section header is just noise — show a flat list instead. */}
      {sections.length > 1
        ? sections.map((section) => (
            <List.Section
              key={section.folder}
              title={section.folder}
              subtitle={`${section.items.length}`}
            >
              {section.items.map(itemNode)}
            </List.Section>
          ))
        : visible.map(itemNode)}
    </List>
  );
}
