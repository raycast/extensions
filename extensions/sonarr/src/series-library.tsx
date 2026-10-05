import { Action, ActionPanel, Icon, Grid, Keyboard } from "@raycast/api";
import { useState, useMemo } from "react";
import type { InstanceState } from "@/lib/types/instance";
import type { SeriesFull } from "@/lib/types/series";
import { useInstance } from "@/lib/hooks/useInstance";
import { useSeries } from "@/lib/hooks/useSonarrAPI";
import {
  formatSeriesTitle,
  getSeriesPoster,
  getRatingDisplay,
  getSeriesStatus,
  formatOverview,
  formatFileSize,
  getSearchPlaceholder,
} from "@/lib/utils/formatting";
import { InstanceActions } from "@/lib/components/InstanceActions";
import { SeriesDetail } from "@/lib/components/SeriesDetail";
import { Shortcuts } from "@/lib/utils/shortcuts";

type FilterStatus = "all" | "available" | "missing";

export default function Command() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const instanceState = useInstance();
  const { data, isLoading, mutate } = useSeries(instanceState.instance);

  const filteredSeries = useMemo(() => {
    if (!data) return [];

    return data
      .filter((series) => {
        if (filterStatus === "all") return true;
        if (filterStatus === "available") return series.statistics && series.statistics.episodeFileCount > 0;
        if (filterStatus === "missing")
          return series.statistics && series.statistics.episodeFileCount < series.statistics.episodeCount;
        return true;
      })
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
  }, [data, filterStatus]);

  // Also reachable with an empty list: without it, switching back out of an
  // instance that returned nothing would mean quitting the command.
  const instancePanel = (
    <ActionPanel>
      <InstanceActions state={instanceState} />
    </ActionPanel>
  );

  return (
    <Grid
      actions={instancePanel}
      columns={5}
      searchBarPlaceholder={getSearchPlaceholder(instanceState)}
      isLoading={isLoading || instanceState.isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Status"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as FilterStatus)}
        >
          <Grid.Dropdown.Item title="All Series" value="all" />
          <Grid.Dropdown.Item title="With Files" value="available" />
          <Grid.Dropdown.Item title="Missing Episodes" value="missing" />
        </Grid.Dropdown>
      }
    >
      {filteredSeries.length === 0 && !isLoading && (
        <Grid.EmptyView
          title="No Series Found"
          description={filterStatus === "all" ? "Your library is empty" : "No series match this filter"}
          icon={Icon.Video}
          actions={instancePanel}
        />
      )}
      {filteredSeries.map((series) => (
        <SeriesGridItem key={series.id} series={series} onRefresh={mutate} instanceState={instanceState} />
      ))}
    </Grid>
  );
}

function SeriesGridItem({
  series,
  onRefresh,
  instanceState,
}: {
  series: SeriesFull;
  onRefresh: () => void;
  instanceState: InstanceState;
}) {
  const sonarrUrl = instanceState.instance?.url ?? "";

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
    sections.push(`**Monitored:** ${series.monitored ? "Yes" : "No"}`);

    if (series.network) {
      sections.push(`**Network:** ${series.network}`);
    }

    if (series.statistics) {
      const stats = series.statistics;
      sections.push(
        `**Episodes:** ${stats.episodeFileCount}/${stats.episodeCount} (${Math.round(stats.percentOfEpisodes)}%)`,
      );
      sections.push(`**Seasons:** ${stats.seasonCount}`);
      sections.push(`**Size on Disk:** ${formatFileSize(stats.sizeOnDisk)}`);
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
    : "N/A";

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
              shortcut={Shortcuts.viewDetails}
            />
            {series.path && (
              <Action.CopyToClipboard
                title="Copy Path"
                content={series.path}
                icon={Icon.Clipboard}
                shortcut={Shortcuts.copyPath}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Utility">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>

          <InstanceActions state={instanceState} />
        </ActionPanel>
      }
    />
  );
}
