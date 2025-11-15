import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { RecentTOON } from "./types";
import { getRecent, deleteRecent, clearAll, getPreview } from "./utils/storage";
import { calculateTokenSavings } from "./utils/encoder";

export default function ShowRecent() {
  const [recent, setRecent] = useState<RecentTOON[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    setIsLoading(true);
    try {
      const items = await getRecent();
      setRecent(items);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load recent TOONs",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (toon: string) => {
    await Clipboard.copy(toon);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: "TOON encoded string copied",
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecent(id);
    await loadRecent();
    await showToast({
      style: Toast.Style.Success,
      title: "Deleted",
      message: "Removed from recent TOONs",
    });
  };

  const handleClearAll = async () => {
    await clearAll();
    await loadRecent();
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared",
      message: "All recent TOONs removed",
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent TOONs..."
      actions={
        recent.length > 0 ? (
          <ActionPanel>
            <Action icon={Icon.Trash} title="Clear All" style={Action.Style.Destructive} onAction={handleClearAll} />
          </ActionPanel>
        ) : undefined
      }
    >
      {recent.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Document} title="No Recent TOONs" description="Converted TOONs will appear here" />
      ) : (
        recent.map((item) => {
          const savings = calculateTokenSavings(item.original, item.toon);
          const preview = getPreview(item.toon, 100);

          return (
            <List.Item
              key={item.id}
              title={preview}
              subtitle={`${item.format.toUpperCase()} • ${formatDate(item.timestamp)}${savings > 0 ? ` • ${savings}% smaller` : ""}`}
              accessories={[
                {
                  tag: {
                    value: item.format,
                    color: item.format === "json" ? Color.Blue : Color.Green,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Clipboard} title="Copy TOON" onAction={() => handleCopy(item.toon)} />
                  <Action icon={Icon.Eye} title="View Original" onAction={() => handleCopy(item.original)} />
                  <Action
                    icon={Icon.Trash}
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(item.id)}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Clear All"
                    style={Action.Style.Destructive}
                    onAction={handleClearAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
