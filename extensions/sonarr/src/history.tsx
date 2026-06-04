import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useHistory } from "@/lib/hooks/useSonarrAPI";
import type { HistoryRecord } from "@/lib/types/history";
import {
  formatAirDate,
  formatEpisodeNumber,
  formatQualityProfile,
  getSeriesPoster,
  getSonarrUrl,
} from "@/lib/utils/formatting";

function getEventColor(eventType: string): Color {
  const normalized = eventType.toLowerCase();

  if (normalized.includes("import")) return Color.Green;
  if (normalized.includes("grab")) return Color.Blue;
  if (normalized.includes("fail") || normalized.includes("error")) return Color.Red;
  if (normalized.includes("delete") || normalized.includes("remove")) return Color.Orange;

  return Color.SecondaryText;
}

function getEventIcon(eventType: string): Icon {
  const normalized = eventType.toLowerCase();

  if (normalized.includes("import")) return Icon.CheckCircle;
  if (normalized.includes("grab")) return Icon.Download;
  if (normalized.includes("fail") || normalized.includes("error")) return Icon.XMarkCircle;
  if (normalized.includes("delete") || normalized.includes("remove")) return Icon.Trash;

  return Icon.Clock;
}

function formatEventLabel(eventType: string): string {
  return eventType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const { data, isLoading, mutate } = useHistory(1, 100);

  const records = data?.records || [];

  const eventTypes = useMemo(() => {
    const values = new Set(records.map((record) => record.eventType).filter(Boolean));
    return Array.from(values).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return records
      .filter((record) => {
        if (eventTypeFilter !== "all" && record.eventType !== eventTypeFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const fields = [record.series?.title, record.episode?.title, record.sourceTitle, record.eventType];

        return fields.some((field) => (field || "").toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, eventTypeFilter, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Search history by series, episode, or release title..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Event Type" value={eventTypeFilter} onChange={setEventTypeFilter}>
          <List.Dropdown.Item title="All Events" value="all" />
          {eventTypes.map((eventType) => (
            <List.Dropdown.Item key={eventType} title={formatEventLabel(eventType)} value={eventType} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredRecords.length === 0 && !isLoading && (
        <List.EmptyView
          title="No History Events"
          description={searchText ? "No events matched your search" : "No recent activity found"}
          icon={Icon.Clock}
        />
      )}

      <List.Section title="Recent History" subtitle={`${filteredRecords.length} events`}>
        {filteredRecords.map((record) => (
          <HistoryListItem key={record.id} record={record} onRefresh={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

function HistoryListItem({ record, onRefresh }: { record: HistoryRecord; onRefresh: () => void }) {
  const sonarrUrl = getSonarrUrl();
  const poster = record.series?.images ? getSeriesPoster(record.series.images) : undefined;

  const seriesTitle = record.series?.title || "Unknown Series";

  const episodeLabel =
    record.episode?.seasonNumber != null && record.episode?.episodeNumber != null
      ? `${formatEpisodeNumber(record.episode.seasonNumber, record.episode.episodeNumber)}${record.episode.title ? ` • ${record.episode.title}` : ""}`
      : record.episode?.title || "Unknown Episode";

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    sections.push(`# ${seriesTitle}`);
    sections.push(`## ${formatEventLabel(record.eventType)}`);
    sections.push("");

    sections.push(`**Date:** ${formatAirDate(record.date)}`);
    sections.push(`**Event Type:** ${record.eventType}`);

    if (record.episode) {
      sections.push(`**Episode:** ${episodeLabel}`);
    }

    if (record.sourceTitle) {
      sections.push(`**Source:** ${record.sourceTitle}`);
    }

    if (record.quality?.quality) {
      sections.push(`**Quality:** ${formatQualityProfile(record.quality.quality)}`);
    }

    if (record.data?.indexer) {
      sections.push(`**Indexer:** ${record.data.indexer}`);
    }

    if (record.data?.downloadClientName) {
      sections.push(`**Download Client:** ${record.data.downloadClientName}`);
    }

    if (record.downloadId) {
      sections.push(`**Download ID:** \`${record.downloadId}\``);
    }

    return sections.join("\n");
  }, [poster, record, seriesTitle, episodeLabel]);

  return (
    <List.Item
      title={seriesTitle}
      subtitle={episodeLabel}
      icon={{ source: poster || getEventIcon(record.eventType), mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: formatAirDate(record.date) },
        {
          tag: {
            value: formatEventLabel(record.eventType),
            color: getEventColor(record.eventType),
          },
        },
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            {record.series?.titleSlug && (
              <Action.OpenInBrowser
                title="Open Series in Sonarr"
                url={`${sonarrUrl}/series/${record.series.titleSlug}`}
                icon={Icon.Globe}
              />
            )}
            <Action.OpenInBrowser
              title="Open History in Sonarr"
              url={`${sonarrUrl}/activity/history`}
              icon={Icon.Clock}
            />
            {record.series?.tvdbId && (
              <Action.OpenInBrowser
                title="Open in Thetvdb"
                url={`https://thetvdb.com/?tab=series&id=${record.series.tvdbId}`}
                icon={Icon.Link}
              />
            )}
            {record.series?.imdbId && (
              <Action.OpenInBrowser
                title="Open in Imdb"
                url={`https://www.imdb.com/title/${record.series.imdbId}`}
                icon={Icon.Link}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Utility">
            {record.sourceTitle && <Action.CopyToClipboard title="Copy Source Title" content={record.sourceTitle} />}
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
