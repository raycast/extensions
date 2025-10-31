import { Action, ActionPanel, Icon, Grid } from "@raycast/api";
import { useState, useMemo } from "react";
import type { SeriesFull } from "@/lib/types/series";
import { useSeries } from "@/lib/hooks/useSonarrAPI";
import {
  formatSeriesTitle,
  getSeriesPoster,
  getRatingDisplay,
  getSeriesStatus,
  formatOverview,
  formatFileSize,
  getSonarrUrl,
} from "@/lib/utils/formatting";
import { SeriesDetail } from "@/lib/components/SeriesDetail";

type FilterStatus = "all" | "available" | "missing";

export default function Command() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const { data, isLoading, mutate } = useSeries();

  const filteredSeries = useMemo(() => {
    if (!data) return [];

    return data
      .filter((series) => {
        if (series.monitored) return false;

        if (filterStatus === "available") return series.statistics && series.statistics.episodeFileCount > 0;
        if (filterStatus === "missing") return !series.statistics || series.statistics.episodeFileCount === 0;
        return true;
      })
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
  }, [data, filterStatus]);

  return (
    <Grid
      columns={5}
      searchBarPlaceholder="Search unmonitored series..."
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Availability"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as FilterStatus)}
        >
          <Grid.Dropdown.Item title="All Series" value="all" />
          <Grid.Dropdown.Item title="With Files" value="available" />
          <Grid.Dropdown.Item title="Missing Files" value="missing" />
        </Grid.Dropdown>
      }
    >
      {filteredSeries.length === 0 && !isLoading && (
        <Grid.EmptyView
          title="No Unmonitored Series"
          description="All series in your library are being monitored"
          icon={Icon.Eye}
        />
      )}
      {filteredSeries.map((series) => (
        <SeriesGridItem key={series.id} series={series} onRefresh={mutate} />
      ))}
    </Grid>
  );
}

function SeriesGridItem({ series, onRefresh }: { series: SeriesFull; onRefresh: () => void }) {
  const sonarrUrl = getSonarrUrl();

  const poster = getSeriesPoster(series.images);

  const content = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    sections.push(`# ${formatSeriesTitle(series.title, series.year)}`);
    sections.push("");

    sections.push(`**Status:** ${getSeriesStatus(series.status)}`);
    sections.push(`**Monitored:** No`);

    if (series.network) {
      sections.push(`**Network:** ${series.network}`);
    }

    if (series.statistics) {
      const stats = series.statistics;
      sections.push(
        `**Episodes:** ${stats.episodeFileCount}/${stats.episodeCount} (${Math.round(stats.percentOfEpisodes)}%)`,
      );
      sections.push(`**Seasons:** ${stats.seasonCount}`);
      if (stats.sizeOnDisk > 0) {
        sections.push(`**Size on Disk:** ${formatFileSize(stats.sizeOnDisk)}`);
      }
    }

    if (series.genres && series.genres.length > 0) {
      sections.push(`**Genres:** ${series.genres.join(", ")}`);
    }

    if (series.ratings) {
      sections.push(`**Rating:** ${getRatingDisplay(series.ratings)}`);
    }

    sections.push(`**Path:** ${series.path}`);

    sections.push("");

    if (series.overview) {
      sections.push("## Overview");
      sections.push(formatOverview(series.overview));
    }

    return sections.join("\n");
  }, [series, poster]);

  const episodeStats = series.statistics
    ? `${series.statistics.episodeFileCount}/${series.statistics.episodeCount}`
    : "0/0";

  return (
    <Grid.Item
      content={{ source: poster || Icon.Video }}
      title={series.title}
      subtitle={series.year?.toString() || ""}
      accessory={{ tooltip: `${episodeStats} episodes` }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open in Sonarr"
              url={`${sonarrUrl}/series/${series.titleSlug}`}
              icon={Icon.Globe}
            />
            {series.tvdbId && (
              <Action.OpenInBrowser
                title="Open in Thetvdb"
                url={`https://thetvdb.com/?tab=series&id=${series.tvdbId}`}
                icon={Icon.Link}
              />
            )}
            {series.imdbId && (
              <Action.OpenInBrowser
                title="Open in Imdb"
                url={`https://www.imdb.com/title/${series.imdbId}`}
                icon={Icon.Link}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Series Actions">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<SeriesDetail content={content} />}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
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
