import { Action, ActionPanel, Grid, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { EpisodeDetail } from "./components/episode-detail";
import { GenericGrid } from "./components/generic-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { addRecentSearch, getRecentSearches } from "./lib/recent-searches";
import { TraktShowHistoryListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const traktClient = initTraktClient();

  useEffect(() => {
    getRecentSearches("episode").then(setRecentSearches);
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
    data: episodes,
    pagination,
  } = useCachedPromise(
    (debouncedSearchText: string) => async (options: PaginationOptions) => {
      if (!debouncedSearchText) {
        return { data: [], hasMore: false };
      }

      // Add to recent searches when performing a search
      await addRecentSearch(debouncedSearchText, "episode");

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.searchEpisodes({
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

  const addEpisodeToHistory = useCallback(async (episode: TraktShowHistoryListItem) => {
    await traktClient.shows.addEpisodeToHistory({
      body: {
        episodes: [
          {
            ids: { trakt: episode.episode.ids.trakt },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const checkInEpisode = useCallback(async (episode: TraktShowHistoryListItem) => {
    await traktClient.shows.checkInEpisode({
      body: {
        episodes: [
          {
            ids: {
              trakt: episode.show.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
    });
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string): void => {
      abortable.current?.abort();
      abortable.current = new AbortController();
      setSearchText(text);
    },
    [abortable],
  );

  const handleAction = useCallback(
    async (
      movie: TraktShowHistoryListItem,
      action: (movie: TraktShowHistoryListItem) => Promise<void>,
      message: string,
    ) => {
      setActionLoading(true);
      try {
        await action(movie);
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
      <List
        searchBarPlaceholder="Search for episodes"
        onSearchTextChange={handleSearchTextChange}
        searchText={searchText}
      >
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
      emptyViewTitle="Search for episodes"
      searchBarPlaceholder="Search for episodes"
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      pagination={pagination}
      items={episodes}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => `${item.episode.title}`}
      subtitle={(item) => `${item.show.title}`}
      poster={(item) => getPosterUrl(item.show.images, "poster.png")}
      keyFn={(item, index) => `${item.show.ids.trakt}-${item.episode.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Eye}
              title="View Details"
              target={
                <EpisodeDetail
                  episode={item}
                  showSlug={item.show.ids.slug}
                  onCheckIn={(episode) =>
                    handleAction(episode as TraktShowHistoryListItem, checkInEpisode, "Episode checked-in")
                  }
                  onAddToHistory={(episode) =>
                    handleAction(episode as TraktShowHistoryListItem, addEpisodeToHistory, "Episode added to history")
                  }
                />
              }
            />
            <Action
              title="Check-in"
              icon={Icon.Checkmark}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => handleAction(item, checkInEpisode, "Episode checked-in")}
            />
            <Action
              title="Mark as Watched"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => handleAction(item, addEpisodeToHistory, "Episode added to history")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("episode", item.show.ids.slug, item.episode.season, item.episode.number)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(item.episode.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
