import { removeQueueItem, useQueue } from "@/lib/hooks/useSonarrAPI";
import type { QueueItem } from "@/lib/types/queue";
import {
  formatAirDate,
  formatDownloadProgress,
  formatEpisodeNumber,
  formatFileSize,
  formatTimeLeft,
  getSeriesPoster,
} from "@/lib/utils/formatting";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, mutate } = useQueue();

  const filteredData = useMemo<QueueItem[]>(() => {
    const queueItems = data?.records || [];

    if (!searchText) return queueItems;

    return queueItems.filter(
      (item) =>
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.series?.title || "").toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [data, searchText]);

  const hasActiveDownloads = useMemo<boolean>(() => {
    const queueItems = data?.records || [];
    return queueItems.some((item) => item.status === "downloading");
  }, [data]);

  useEffect(() => {
    if (!hasActiveDownloads) return;

    const interval = setInterval(() => {
      mutate();
    }, 5000);

    return () => clearInterval(interval);
  }, [hasActiveDownloads, mutate]);

  return (
    <List
      searchBarPlaceholder="Search downloads..."
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {filteredData.length === 0 && !isLoading && (
        <List.EmptyView
          title={searchText ? "No Results" : "Queue is Empty"}
          description={searchText ? "No downloads match your search" : "No active downloads or queued episodes"}
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
  const poster = item.series ? getSeriesPoster(item.series.images) : undefined;

  const statusIcon =
    item.status === "downloading"
      ? Icon.Download
      : item.status === "completed"
        ? Icon.Check
        : item.trackedDownloadStatus === "warning"
          ? Icon.Warning
          : Icon.XMarkCircle;

  const statusColor =
    item.status === "downloading"
      ? Color.Blue
      : item.status === "completed"
        ? Color.Green
        : item.trackedDownloadStatus === "warning"
          ? Color.Orange
          : Color.Red;

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    if (item.series) {
      sections.push(`# ${item.series.title}`);
    }

    if (item.episode) {
      sections.push(
        `## ${formatEpisodeNumber(item.episode.seasonNumber, item.episode.episodeNumber)}: ${item.episode.title}`,
      );
      sections.push("");
      if (item.episode.airDateUtc) {
        sections.push(`**Air Date:** ${formatAirDate(item.episode.airDateUtc)}`);
      }
    }

    sections.push("");
    sections.push("### Download Information");
    sections.push(`**Status:** ${item.status}`);
    sections.push(`**Progress:** ${progressText}`);
    sections.push(`**Size:** ${formatFileSize(item.size)}`);
    sections.push(`**Remaining:** ${formatFileSize(item.sizeleft)}`);

    if (item.timeleft) {
      sections.push(`**Time Left:** ${formatTimeLeft(item.timeleft)}`);
    }

    sections.push(`**Protocol:** ${item.protocol.toUpperCase()}`);
    sections.push(`**Download Client:** ${item.downloadClient}`);
    sections.push(`**Indexer:** ${item.indexer}`);

    sections.push("");

    if (item.quality) {
      sections.push("### Quality");
      sections.push(`**Profile:** ${item.quality.quality.name}`);
      sections.push(`**Resolution:** ${item.quality.quality.resolution}p`);
      sections.push("");
    }

    if (item.statusMessages && item.statusMessages.length > 0) {
      sections.push("### Messages");
      item.statusMessages.forEach((msg) => {
        sections.push(`**${msg.title}**`);
        msg.messages.forEach((m) => sections.push(`- ${m}`));
      });
      sections.push("");
    }

    if (item.errorMessage) {
      sections.push("### Error");
      sections.push(`⚠️ ${item.errorMessage}`);
    }

    return sections.join("\n");
  }, [item, poster, progressText]);

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

    if (confirmed) {
      try {
        await removeQueueItem(item.id, blocklist);
        onRefresh();
      } catch {
        // Error toast already shown by removeQueueItem()
      }
    }
  };

  const timeLeftText = item.timeleft ? formatTimeLeft(item.timeleft) : "";

  return (
    <List.Item
      title={item.title}
      subtitle={item.series?.title}
      icon={{ source: poster || statusIcon, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: formatFileSize(item.size) },
        {
          tag: {
            value: progressText,
            color: statusColor,
          },
        },
        ...(timeLeftText ? [{ text: timeLeftText }] : []),
        {
          icon: statusIcon,
          tooltip: item.status,
        },
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Queue Actions">
            <Action
              title="Remove from Queue"
              icon={Icon.Trash}
              onAction={() => handleRemove(false)}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
            <Action
              title="Remove and Blocklist"
              icon={Icon.XMarkCircle}
              onAction={() => handleRemove(true)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Utility">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
