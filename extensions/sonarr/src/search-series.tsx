import { Action, ActionPanel, Icon, List, Color, Image } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import type { InstanceState } from "@/lib/types/instance";
import type { SeriesLookup } from "@/lib/types/series";
import { useInstance } from "@/lib/hooks/useInstance";
import { searchSeries, useSeries } from "@/lib/hooks/useSonarrAPI";
import { getSearchPlaceholder, getSeriesPoster, getSeriesStatus } from "@/lib/utils/formatting";
import AddSeriesForm from "@/lib/components/AddSeriesForm";
import { InstanceActions } from "@/lib/components/InstanceActions";
import { Shortcuts } from "@/lib/utils/shortcuts";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SeriesLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestId = useRef(0);
  const instanceState = useInstance();
  const { instance } = instanceState;
  const { data: existingSeries, mutate } = useSeries(instance);

  const existingSeriesIds = useMemo(() => {
    return new Set((existingSeries || []).map((s) => s.tvdbId));
  }, [existingSeries]);

  useEffect(() => {
    const searchTerm = searchText.trim();

    if (searchTerm.length < 3 || !instance) {
      searchRequestId.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    searchRequestId.current += 1;
    const requestId = searchRequestId.current;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchSeries(instance, searchTerm);

        if (requestId === searchRequestId.current) {
          setSearchResults(results);
        }
      } finally {
        if (requestId === searchRequestId.current) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText, instance]);

  // Also reachable with an empty list: without it, switching back out of an
  // instance that returned nothing would mean quitting the command.
  const instancePanel = (
    <ActionPanel>
      <InstanceActions state={instanceState} />
    </ActionPanel>
  );

  return (
    <List
      actions={instancePanel}
      searchBarPlaceholder={getSearchPlaceholder(instanceState, "Search for TV series")}
      onSearchTextChange={setSearchText}
      isLoading={isSearching || instanceState.isLoading}
      throttle
    >
      {searchResults.length === 0 && searchText.trim().length >= 3 && !isSearching && (
        <List.EmptyView
          title="No Series Found"
          description="Try a different search term"
          icon={Icon.MagnifyingGlass}
          actions={instancePanel}
        />
      )}
      {searchResults.length === 0 && searchText.trim().length < 3 && (
        <List.EmptyView
          title="Search for TV Series"
          description="Enter at least 3 characters to start searching"
          icon={Icon.Video}
          actions={instancePanel}
        />
      )}
      {searchResults.map((series) => (
        <SeriesListItem
          key={series.tvdbId}
          series={series}
          isInLibrary={existingSeriesIds.has(series.tvdbId)}
          onSeriesAdded={mutate}
          instanceState={instanceState}
        />
      ))}
    </List>
  );
}

function SeriesListItem({
  series,
  isInLibrary,
  onSeriesAdded,
  instanceState,
}: {
  series: SeriesLookup;
  isInLibrary: boolean;
  onSeriesAdded: () => void;
  instanceState: InstanceState;
}) {
  const poster = getSeriesPoster(series.images) || series.remotePoster;
  const status = getSeriesStatus(series.status);
  const primaryGenres = series.genres?.slice(0, 2) ?? [];

  const statusColor =
    status === "Continuing"
      ? Color.Green
      : status === "Upcoming"
        ? Color.Orange
        : status === "Ended"
          ? Color.SecondaryText
          : Color.Red;

  const genreAccessories = primaryGenres.map((genre) => ({
    tag: { value: genre, color: Color.SecondaryText },
  }));

  return (
    <List.Item
      title={series.title}
      subtitle={series.year?.toString() || ""}
      icon={{ source: poster || Icon.Video, mask: poster ? undefined : Image.Mask.Circle }}
      accessories={[
        ...genreAccessories,
        { tag: { value: status, color: statusColor } },
        isInLibrary
          ? {
              icon: { source: Icon.CheckCircle, tintColor: Color.Green },
              tooltip: "In Library",
            }
          : {
              icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
              tooltip: "Not in Library",
            },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Series Actions">
            {!isInLibrary && (
              <Action.Push
                title="Configure & Add"
                icon={Icon.Plus}
                target={
                  <AddSeriesForm series={series} onSeriesAdded={onSeriesAdded} instance={instanceState.instance} />
                }
                shortcut={Shortcuts.configureAndAdd}
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

          <InstanceActions state={instanceState} />
        </ActionPanel>
      }
    />
  );
}
