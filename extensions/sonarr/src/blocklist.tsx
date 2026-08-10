import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useBlocklist } from "@/lib/hooks/useSonarrAPI";
import type { BlocklistRecord } from "@/lib/types/blocklist";
import { formatAirDate, formatQualityProfile, getSeriesPoster, getSonarrUrl } from "@/lib/utils/formatting";

function normalizeProtocol(protocol?: string): string {
  if (!protocol) return "Unknown";

  if (protocol === "1") return "Usenet";
  if (protocol === "2") return "Torrent";

  return protocol.charAt(0).toUpperCase() + protocol.slice(1).toLowerCase();
}

function getProtocolColor(protocol?: string): Color {
  const normalized = normalizeProtocol(protocol).toLowerCase();

  if (normalized === "torrent") return Color.Blue;
  if (normalized === "usenet") return Color.Purple;

  return Color.SecondaryText;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const { data, isLoading, mutate } = useBlocklist(1, 100);

  const records = data?.records || [];

  const protocols = useMemo(() => {
    const values = new Set(records.map((record) => normalizeProtocol(record.protocol)));
    return Array.from(values).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return records
      .filter((record) => {
        const normalizedProtocol = normalizeProtocol(record.protocol);

        if (protocolFilter !== "all" && normalizedProtocol !== protocolFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const fields = [record.sourceTitle, record.series?.title, record.indexer, normalizedProtocol];

        return fields.some((field) => (field || "").toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, protocolFilter, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Search blocked releases..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Protocol" value={protocolFilter} onChange={setProtocolFilter}>
          <List.Dropdown.Item title="All Protocols" value="all" />
          {protocols.map((protocol) => (
            <List.Dropdown.Item key={protocol} title={protocol} value={protocol} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredRecords.length === 0 && !isLoading && (
        <List.EmptyView
          title="Blocklist is Empty"
          description={searchText ? "No blocklist entries matched your search" : "No blocked releases found"}
          icon={Icon.CheckCircle}
        />
      )}

      <List.Section title="Blocked Releases" subtitle={`${filteredRecords.length} items`}>
        {filteredRecords.map((record) => (
          <BlocklistItem key={record.id} record={record} onRefresh={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

function BlocklistItem({ record, onRefresh }: { record: BlocklistRecord; onRefresh: () => void }) {
  const sonarrUrl = getSonarrUrl();
  const poster = record.series?.images ? getSeriesPoster(record.series.images) : undefined;

  const seriesTitle = record.series?.title || "Unknown Series";
  const releaseTitle = record.sourceTitle || "Unknown Release";
  const protocol = normalizeProtocol(record.protocol);

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    sections.push(`# ${seriesTitle}`);
    sections.push(`## ${releaseTitle}`);
    sections.push("");

    sections.push(`**Blocked At:** ${formatAirDate(record.date)}`);
    sections.push(`**Protocol:** ${protocol}`);

    if (record.quality?.quality) {
      sections.push(`**Quality:** ${formatQualityProfile(record.quality.quality)}`);
    }

    if (record.indexer) {
      sections.push(`**Indexer:** ${record.indexer}`);
    }

    if (record.downloadClient) {
      sections.push(`**Download Client:** ${record.downloadClient}`);
    }

    if (record.languages && record.languages.length > 0) {
      sections.push(`**Languages:** ${record.languages.map((language) => language.name).join(", ")}`);
    }

    if (record.message) {
      sections.push("");
      sections.push("### Reason");
      sections.push(record.message);
    }

    if (record.episodeIds && record.episodeIds.length > 0) {
      sections.push("");
      sections.push(`**Episode IDs:** ${record.episodeIds.join(", ")}`);
    }

    return sections.join("\n");
  }, [poster, protocol, record, releaseTitle, seriesTitle]);

  return (
    <List.Item
      title={releaseTitle}
      subtitle={seriesTitle}
      icon={{ source: poster || Icon.Shield, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: formatAirDate(record.date) },
        {
          tag: {
            value: protocol,
            color: getProtocolColor(record.protocol),
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
              title="Open Blocklist in Sonarr"
              url={`${sonarrUrl}/activity/blocklist`}
              icon={Icon.Shield}
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
            <Action.CopyToClipboard title="Copy Release Title" content={releaseTitle} />
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
