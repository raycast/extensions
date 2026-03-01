import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { removeQueueItem, useQueue } from "@/lib/hooks/useLidarrAPI";
import type { QueueItem } from "@/lib/types/lidarr";
import { formatDownloadProgress, formatFileSize, formatTimeLeft } from "@/lib/utils/formatting";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, mutate } = useQueue();

  const filteredData = useMemo(() => {
    const queueItems = data?.records || [];
    const query = searchText.toLowerCase();

    if (!query) return queueItems;

    return queueItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.artist?.artistName || "").toLowerCase().includes(query) ||
        (item.album?.title || "").toLowerCase().includes(query) ||
        (item.downloadClient || "").toLowerCase().includes(query) ||
        (item.indexer || "").toLowerCase().includes(query),
    );
  }, [data, searchText]);

  useEffect(() => {
    mutate();
  }, [mutate]);

  useEffect(() => {
    const interval = setInterval(() => {
      mutate();
    }, 10000);

    return () => clearInterval(interval);
  }, [mutate]);

  return (
    <List
      searchBarPlaceholder="Search downloads..."
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {filteredData.length === 0 && !isLoading && (
        <List.EmptyView
          title={searchText ? "No Results" : "Queue is Empty"}
          description={searchText ? "No downloads match your search" : "No active downloads in Lidarr queue"}
          icon={Icon.Download}
        />
      )}
      <List.Section title="Download Queue" subtitle={`${filteredData.length} items`}>
        {filteredData.map((item) => (
          <QueueListItem key={item.id} item={item} onRefresh={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

function QueueListItem({ item, onRefresh }: { item: QueueItem; onRefresh: () => void }) {
  const progress = formatDownloadProgress(item.sizeleft, item.size);
  const progressText = `${Math.round(progress)}%`;

  const statusColor =
    item.status === "downloading"
      ? Color.Blue
      : item.status === "completed"
        ? Color.Green
        : item.trackedDownloadStatus === "warning"
          ? Color.Orange
          : Color.Red;

  const handleRemove = async (blocklist: boolean) => {
    const confirmed = await confirmAlert({
      title: blocklist ? "Remove and Blocklist?" : "Remove from Queue?",
      message: blocklist
        ? "This will remove the download and prevent it from being grabbed again."
        : "This will remove the download from the queue.",
      primaryAction: {
        title: blocklist ? "Remove & Blocklist" : "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;
    await removeQueueItem(item.id, blocklist);
    onRefresh();
  };

  return (
    <List.Item
      title={item.artist?.artistName || "Unknown Artist"}
      subtitle={item.album?.title || item.title}
      accessories={[
        { text: formatFileSize(item.size) },
        { tag: { value: progressText, color: statusColor } },
        { text: item.timeleft ? formatTimeLeft(item.timeleft) : "-" },
        { text: item.downloadClient || "-" },
        { text: item.indexer || "-" },
      ]}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action title="Remove from Queue" icon={Icon.Trash} onAction={() => handleRemove(false)} />
          <Action title="Remove and Blocklist" icon={Icon.XMarkCircle} onAction={() => handleRemove(true)} />
        </ActionPanel>
      }
    />
  );
}
