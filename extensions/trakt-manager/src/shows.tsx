import { Action, ActionPanel, Grid, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { SeasonGrid } from "./components/season-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { addRecentSearch, getRecentSearches } from "./lib/recent-searches";
import { TraktShowListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const traktClient = initTraktClient();

  useEffect(() => {
    getRecentSearches("show").then(setRecentSearches);
  }, []);

  // Debounce search text
  useEffect(() => {
    // Use longer delay when transitioning from empty search to results (1000ms)
    // Use shorter delay when already searching and refining (350ms)
    const delay = debouncedSearchText === "" ? 1000 : 350;

    const timer = global.setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, delay);

    return () => global.clearTimeout(timer);
  }, [searchText, debouncedSearchText]);

  const {
    isLoading,
    data: shows,
    pagination,
  } = useCachedPromise(
    (debouncedSearchText: string) => async (options: PaginationOptions) => {
      if (!debouncedSearchText) {
        return { data: [], hasMore: false };
      }

      // Add to recent searches when performing a search
      await addRecentSearch(debouncedSearchText, "show");

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.searchShows({
        query: {
          query: debouncedSearchText,
          page: options.page + 1,
          limit: 10,
          fields: "title",
          extended: "full,cloud9",
        },
        fetchOptions: {
          signal: abortable.current.signal,
        },
      });

      if (response.status !== 200) return { data: [], hasMore: false };
      const paginatedResponse = withPagination(response);

      return {
        data: paginatedResponse.data,
        hasMore:
          paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
      };
    },
    [debouncedSearchText],
    {
      initialData: undefined,
      keepPreviousData: true,
      abortable,
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    },
  );

  const addShowToWatchlist = useCallback(async (show: TraktShowListItem) => {
    await traktClient.shows.addShowToWatchlist({
      body: {
        shows: [
          {
            ids: {
              trakt: show.show.ids.trakt,
            },
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const checkInFirstEpisodeToHistory = useCallback(async (show: TraktShowListItem) => {
    const response = await traktClient.shows.getEpisode({
      params: {
        showid: show.show.ids.trakt,
        seasonNumber: 1,
        episodeNumber: 1,
      },
      query: {
        extended: "full",
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });

    if (response.status !== 200) throw new Error("Failed to get first episode");
    const firstEpisode = response.body;

    await traktClient.shows.checkInEpisode({
      body: {
        episodes: [
          {
            ids: {
              trakt: firstEpisode.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const handleSearchTextChange = useCallback((text: string): void => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setSearchText(text);
  }, []);

  const handleAction = useCallback(
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>, message: string) => {
      setActionLoading(true);
      try {
        await action(show);
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
      } catch (e) {
        showToast({
          title: (e as Error).message,
          style: Toast.Style.Failure,
        });
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  // Show recent searches when no search text
  if (!searchText && recentSearches.length > 0) {
    return (
      <List searchBarPlaceholder="Search for shows" onSearchTextChange={handleSearchTextChange} searchText={searchText}>
        <List.Section title="Recent Searches">
          {recentSearches.map((query, index) => (
            <List.Item
              key={index}
              title={query}
              subtitle="Recent search"
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => handleSearchTextChange(query)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Search for shows"
      searchBarPlaceholder="Search for shows"
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      throttle={true}
      pagination={pagination}
      items={shows}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => item.show.title}
      subtitle={(item) => item.show.year?.toString() || ""}
      poster={(item) => getPosterUrl(item.show.images, "poster.png")}
      keyFn={(item, index) => `${item.show.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Browse Seasons"
              target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
            />
            <Action
              title="Add to Watchlist"
              icon={Icon.Bookmark}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => handleAction(item, addShowToWatchlist, "Show added to watchlist")}
            />
            <Action
              title="Check-in"
              icon={Icon.Checkmark}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => handleAction(item, checkInFirstEpisodeToHistory, "First episode checked-in")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("shows", item.show.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(item.show.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
