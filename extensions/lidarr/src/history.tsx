import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useHistory } from "@/lib/hooks/useLidarrAPI";
import type { HistoryRecord } from "@/lib/types/lidarr";
import { formatDate } from "@/lib/utils/formatting";

function formatEventLabel(eventType: string): string {
  return eventType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTrackTitle(record: HistoryRecord): string {
  const data = record.data || {};
  return String(data.trackTitle || data.track || data.songTitle || record.sourceTitle || "-");
}

function getQuality(record: HistoryRecord): string {
  const data = record.data || {};
  return String(data.quality || data.qualityName || data.qualityCutoffNotMet || "-");
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

    return records.filter((record) => {
      if (eventTypeFilter !== "all" && record.eventType !== eventTypeFilter) return false;
      if (!query) return true;

      const fields = [
        formatEventLabel(record.eventType),
        record.artist?.artistName,
        record.album?.title,
        getTrackTitle(record),
        getQuality(record),
      ];

      return fields.some((field) => (field || "").toLowerCase().includes(query));
    });
  }, [records, eventTypeFilter, searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Search history..."
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
        <List.EmptyView title="No History Events" description="No events matched your filters" icon={Icon.Clock} />
      )}

      <List.Section title="Recent History" subtitle={`${filteredRecords.length} events`}>
        {filteredRecords.map((record) => (
          <List.Item
            key={record.id}
            title={formatEventLabel(record.eventType)}
            subtitle={record.artist?.artistName || "-"}
            accessories={[
              { text: record.album?.title || "-" },
              { text: getTrackTitle(record) },
              { text: getQuality(record) },
              { text: formatDate(record.date) },
            ]}
            actions={
              <ActionPanel>
                {record.sourceTitle && (
                  <Action.CopyToClipboard title="Copy Source Title" content={record.sourceTitle} />
                )}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={mutate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
