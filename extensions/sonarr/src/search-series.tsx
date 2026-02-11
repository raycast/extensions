import { Action, ActionPanel, Icon, List, Color, Image } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import type { SeriesLookup } from "@/lib/types/series";
import { searchSeries, useSeries } from "@/lib/hooks/useSonarrAPI";
import {
  formatSeriesTitle,
  getSeriesPoster,
  getRatingDisplay,
  getSeriesStatus,
  getGenresDisplay,
  formatOverview,
  formatDuration,
} from "@/lib/utils/formatting";
import AddSeriesForm from "@/lib/components/AddSeriesForm";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SeriesLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { data: existingSeries, mutate } = useSeries();

  const existingSeriesIds = useMemo(() => {
    return new Set((existingSeries || []).map((s) => s.tvdbId));
  }, [existingSeries]);

  useEffect(() => {
    if (searchText.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchSeries(searchText);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search for TV series..."
      onSearchTextChange={setSearchText}
      isLoading={isSearching}
      throttle
      isShowingDetail
    >
      {searchResults.length === 0 && searchText.trim().length >= 3 && !isSearching && (
        <List.EmptyView title="No Series Found" description="Try a different search term" icon={Icon.MagnifyingGlass} />
      )}
      {searchResults.length === 0 && searchText.trim().length < 3 && (
        <List.EmptyView
          title="Search for TV Series"
          description="Enter at least 3 characters to start searching"
          icon={Icon.Video}
        />
      )}
      {searchResults.map((series) => (
        <SeriesListItem
          key={series.tvdbId}
          series={series}
          isInLibrary={existingSeriesIds.has(series.tvdbId)}
          onSeriesAdded={mutate}
        />
      ))}
    </List>
  );
}

function SeriesListItem({
  series,
  isInLibrary,
  onSeriesAdded,
}: {
  series: SeriesLookup;
  isInLibrary: boolean;
  onSeriesAdded: () => void;
}) {
  const poster = getSeriesPoster(series.images) || series.remotePoster;

  const markdown = useMemo(() => {
    const sections: string[] = [];

    if (poster) {
      sections.push(`![](${poster})`);
      sections.push("");
    }

    sections.push(`# ${formatSeriesTitle(series.title, series.year)}`);
    sections.push("");

    sections.push(`**Status:** ${getSeriesStatus(series.status)}`);

    if (series.network) {
      sections.push(`**Network:** ${series.network}`);
    }

    if (series.runtime) {
      sections.push(`**Runtime:** ${formatDuration(series.runtime)}`);
    }

    if (series.seasons && series.seasons.length > 0) {
      sections.push(`**Seasons:** ${series.seasons.length}`);
    }

    if (series.genres && series.genres.length > 0) {
      sections.push(`**Genres:** ${series.genres.join(", ")}`);
    }

    if (series.ratings) {
      sections.push(`**Rating:** ${getRatingDisplay(series.ratings)}`);
    }

    if (series.certification) {
      sections.push(`**Certification:** ${series.certification}`);
    }

    sections.push("");

    if (series.overview) {
      sections.push("## Overview");
      sections.push(formatOverview(series.overview));
    }

    return sections.join("\n");
  }, [series, poster]);

  return (
    <List.Item
      title={series.title}
      subtitle={series.year?.toString() || ""}
      icon={{ source: poster || Icon.Video, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        { text: getGenresDisplay(series.genres) },
        { text: getSeriesStatus(series.status) },
        ...(isInLibrary
          ? [
              {
                tag: { value: "In Library", color: Color.Green },
                icon: Icon.Check,
              },
            ]
          : []),
      ]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Series Actions">
            {!isInLibrary && (
              <Action.Push
                title="Configure & Add"
                icon={Icon.Plus}
                target={<AddSeriesForm series={series} onSeriesAdded={onSeriesAdded} />}
                shortcut={{ modifiers: ["cmd"], key: "a" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
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
        </ActionPanel>
      }
    />
  );
}
