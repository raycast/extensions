import { List, Action, ActionPanel, Icon, showToast, Toast, confirmAlert, Alert, Color, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHistory, getFavorites, toggleFavorite, deleteHistoryItem, clearHistory, HistoryItem } from "./storage";

type ViewMode = "all" | "favorites";

export default function ViewHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = viewMode === "all" ? await getHistory() : await getFavorites();
      setItems(history);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [viewMode]);

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
      await loadHistory();
      await showToast({
        style: Toast.Style.Success,
        title: "Updated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAlert({
      title: "Delete this item?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteHistoryItem(id);
        await loadHistory();
        await showToast({
          style: Toast.Style.Success,
          title: "Deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Clear all history?",
      message: "This will delete all history items. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await clearHistory();
        await loadHistory();
        await showToast({
          style: Toast.Style.Success,
          title: "History cleared",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear history",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleCopyOdesliLink = async (url: string) => {
    await Clipboard.copy(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Odesli link",
    });
  };

  const handleCopyOriginalLink = async (url: string) => {
    await Clipboard.copy(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied original link",
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={viewMode} onChange={(newValue) => setViewMode(newValue as ViewMode)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
        </List.Dropdown>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Music}
          title={viewMode === "favorites" ? "No favorites yet" : "No history yet"}
          description="Convert a music link to get started"
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: item.thumbnailUrl || Icon.Music }}
            title={item.title || "Unknown Track"}
            subtitle={item.artist}
            accessories={[
              { text: formatDate(item.timestamp) },
              ...(item.isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Copy">
                  <Action
                    title="Copy Odesli Link"
                    icon={Icon.Link}
                    onAction={() => handleCopyOdesliLink(item.odesliUrl)}
                  />
                  <Action
                    title="Copy Original Link"
                    icon={Icon.Link}
                    onAction={() => handleCopyOriginalLink(item.originalUrl)}
                  />
                  <Action.OpenInBrowser url={item.odesliUrl} title="Open in Browser" />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={item.isFavorite ? Icon.StarDisabled : Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => handleToggleFavorite(item.id)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDelete(item.id)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="History">
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
