import { countOf } from "@chrismessina/raycast-kit";
import { useCallback, useEffect, useState } from "react";
import { Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { HistoryItemActions } from "./actions/history-item-actions";
import {
  clearHistory,
  clearHistoryByAge,
  DownloadHistoryItem,
  getDownloadHistory,
  removeFromHistory,
} from "./lib/history";
import { formatBytes } from "./lib/progress";

function getStatusIcon(status: DownloadHistoryItem["status"]): { source: Icon; tintColor: Color } {
  switch (status) {
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "cancelled":
      return { source: Icon.MinusCircle, tintColor: Color.Orange };
    default:
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export default function Command() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const items = await getDownloadHistory();
    setHistory(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClearHistory = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete All Entries",
      // Say what is NOT affected: "delete" next to a list of files reads as though
      // it removes the files themselves.
      message: "This clears the download history. The downloaded files are not deleted.",
      primaryAction: {
        title: "Delete All Entries",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
      setHistory([]);
      await showToast({ style: Toast.Style.Success, title: "Deleted All Entries" });
    }
  }, []);

  const handleRemoveItem = useCallback(async (item: DownloadHistoryItem) => {
    await removeFromHistory(item.id);
    setHistory((prev) => prev.filter((i) => i.id !== item.id));
    await showToast({
      style: Toast.Style.Success,
      title: "Entry Deleted",
      message: "The downloaded file was not removed.",
    });
  }, []);

  const handleClearByAge = useCallback(
    async (minutes: number) => {
      const removedCount = await clearHistoryByAge(minutes);
      await loadHistory();

      if (removedCount === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No Entries to Delete",
          message: `Nothing in the history from the last ${minutes} minutes`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Deleted ${countOf(removedCount, "Entry", { plural: "Entries" })}`,
          message: `From the last ${minutes} minutes. The downloaded files were not removed.`,
        });
      }
    },
    [loadHistory],
  );

  const completedCount = history.filter((item) => item.status === "completed").length;
  const cancelledCount = history.filter((item) => item.status === "cancelled").length;
  const failedCount = history.length - completedCount - cancelledCount;

  // Cancelled is its own outcome now — folding it into "failed" told the user a
  // download they stopped on purpose had gone wrong.
  const historySummary = [
    `${completedCount} completed`,
    failedCount > 0 ? `${failedCount} failed` : null,
    cancelledCount > 0 ? `${cancelledCount} cancelled` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <List isLoading={isLoading} navigationTitle="Download History" searchBarPlaceholder="Search history...">
      {history.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Clock} title="No Download History" description="Downloads will appear here" />
      ) : (
        <List.Section title="History" subtitle={historySummary}>
          {history.map((item) => (
            <List.Item
              key={item.id}
              title={item.filename}
              subtitle={item.url}
              icon={getStatusIcon(item.status)}
              accessories={[
                ...(item.bytesDownloaded ? [{ text: formatBytes(item.bytesDownloaded) }] : []),
                { text: formatDate(item.timestamp), tooltip: new Date(item.timestamp).toLocaleString() },
              ]}
              actions={
                <HistoryItemActions
                  item={item}
                  onRemove={handleRemoveItem}
                  onClearByAge={handleClearByAge}
                  onClearAll={handleClearHistory}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
