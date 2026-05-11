import { Action, ActionPanel, Icon, List, Color, Image } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo } from "react";
import { isFuture, isPast } from "date-fns";
import type { WantedMissingEpisode } from "@/lib/types/wanted";
import { useWantedMissing, searchEpisode } from "@/lib/hooks/useSonarrAPI";
import {
  formatAirDate,
  formatEpisodeNumber,
  formatOverview,
  getSeriesPoster,
  getRatingDisplay,
  formatRelativeTime,
  getSonarrUrl,
} from "@/lib/utils/formatting";

type FilterStatus = "all" | "missing" | "upcoming" | "unreleased";

export default function Command() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, mutate } = useWantedMissing(1, 100);

  const filteredEpisodes = useMemo(() => {
    if (!data || !data.records) return [];

    return data.records.filter((episode) => {
      const airDate = new Date(episode.airDateUtc);
      const hasAired = isPast(airDate);
      const willAir = isFuture(airDate);

      // Filter by status
      let statusMatch = true;
      if (filterStatus === "missing") statusMatch = hasAired;
      else if (filterStatus === "upcoming") statusMatch = willAir;
      else if (filterStatus === "unreleased") statusMatch = !episode.airDateUtc;

      // Filter by search text
      const searchMatch =
        !searchText ||
        episode.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (episode.series?.title || "").toLowerCase().includes(searchText.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [data, filterStatus, searchText]);

  return (
    <List
      searchBarPlaceholder="Search missing episodes..."
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as FilterStatus)}
        >
          <List.Dropdown.Item title="All Episodes" value="all" />
          <List.Dropdown.Item title="Missing (Aired)" value="missing" />
          <List.Dropdown.Item title="Upcoming" value="upcoming" />
          <List.Dropdown.Item title="Not Released" value="unreleased" />
        </List.Dropdown>
      }
    >
      {filteredEpisodes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Missing Episodes"
          description={filterStatus === "all" ? "All monitored episodes have files" : "No episodes match this filter"}
          icon={Icon.Check}
        />
      )}
      <List.Section title="Missing Episodes" subtitle={`${filteredEpisodes.length} episodes`}>
        {filteredEpisodes.map((episode) => (
          <MissingEpisodeListItem key={episode.id} episode={episode} onRefresh={mutate} />
        ))}
      </List.Section>
    </List>
  );
}

function MissingEpisodeListItem({ episode, onRefresh }: { episode: WantedMissingEpisode; onRefresh: () => void }) {
  const sonarrUrl = getSonarrUrl();

  const poster = episode.series ? getSeriesPoster(episode.series.images) : undefined;
  const airDate = new Date(episode.airDateUtc);
  const hasAired = isPast(airDate);
  const willAir = isFuture(airDate);

  const statusIcon = hasAired ? "🔴" : willAir ? "🟡" : "⚪";
  const statusLabel = hasAired ? "Missing" : willAir ? "Upcoming" : "Not Released";
  const statusColor = hasAired ? Color.Red : willAir ? Color.Yellow : Color.SecondaryText;

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    if (episode.series) {
      sections.push(`# ${episode.series.title}`);
    }

    sections.push(`## ${formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}: ${episode.title}`);
    sections.push("");

    sections.push(`**Status:** ${statusIcon} ${statusLabel}`);
    sections.push(`**Air Date:** ${formatAirDate(episode.airDateUtc)}`);
    sections.push(`**Relative:** ${formatRelativeTime(episode.airDateUtc)}`);
    sections.push(`**Monitored:** ${episode.monitored ? "Yes" : "No"}`);

    if (episode.series) {
      if (episode.series.network) {
        sections.push(`**Network:** ${episode.series.network}`);
      }

      if (episode.series.ratings) {
        sections.push(`**Series Rating:** ${getRatingDisplay(episode.series.ratings)}`);
      }
    }

    sections.push("");

    if (episode.lastSearchTime) {
      sections.push(`**Last Search:** ${formatRelativeTime(episode.lastSearchTime)}`);
      sections.push("");
    }

    if (episode.overview) {
      sections.push("### Episode Overview");
      sections.push(formatOverview(episode.overview));
      sections.push("");
    }

    if (episode.series && episode.series.overview) {
      sections.push("### Series Overview");
      sections.push(formatOverview(episode.series.overview, 300));
    }

    return sections.join("\n");
  }, [episode, poster, statusIcon, statusLabel]);

  const handleSearchEpisode = async () => {
    try {
      await searchEpisode([episode.id]);
      onRefresh();
    } catch (error) {
      showFailureToast("Failed to search episode", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Item
      title={episode.title}
      subtitle={
        episode.series
          ? `${episode.series.title} • ${formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}`
          : formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)
      }
      icon={{ source: poster || Icon.Video, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: formatAirDate(episode.airDateUtc) },
        {
          tag: {
            value: statusLabel,
            color: statusColor,
          },
        },
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Episode Actions">
            {hasAired && (
              <Action
                title="Search Episode"
                icon={Icon.MagnifyingGlass}
                onAction={handleSearchEpisode}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            {episode.series && (
              <>
                <Action.OpenInBrowser
                  title="Open in Sonarr"
                  url={`${sonarrUrl}/series/${episode.series.titleSlug}`}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {episode.series.tvdbId && (
                  <Action.OpenInBrowser
                    title="Open in Thetvdb"
                    url={`https://thetvdb.com/?tab=series&id=${episode.series.tvdbId}`}
                    icon={Icon.Link}
                  />
                )}
                {episode.series.imdbId && (
                  <Action.OpenInBrowser
                    title="Open in Imdb"
                    url={`https://www.imdb.com/title/${episode.series.imdbId}`}
                    icon={Icon.Link}
                  />
                )}
              </>
            )}
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
