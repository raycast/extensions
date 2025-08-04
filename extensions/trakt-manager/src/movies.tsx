import { Action, ActionPanel, Grid, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { MovieDetail } from "./components/movie-detail";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { addRecentSearch, getRecentSearches } from "./lib/recent-searches";
import { TraktMovieListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const traktClient = initTraktClient();

  useEffect(() => {
    getRecentSearches("movie").then(setRecentSearches);
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
    data: movies,
    pagination,
  } = useCachedPromise(
    (debouncedSearchText: string) => async (options: PaginationOptions) => {
      if (!debouncedSearchText) {
        return { data: [], hasMore: false };
      }

      // Add to recent searches when performing a search
      await addRecentSearch(debouncedSearchText, "movie");

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.movies.searchMovies({
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

  const addMovieToWatchlist = useCallback(async (movie: TraktMovieListItem) => {
    await traktClient.movies.addMovieToWatchlist({
      body: {
        movies: [
          {
            ids: { trakt: movie.movie.ids.trakt },
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const addMovieToHistory = useCallback(async (movie: TraktMovieListItem) => {
    await traktClient.movies.addMovieToHistory({
      body: {
        movies: [
          {
            ids: { trakt: movie.movie.ids.trakt },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
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
    async (movie: TraktMovieListItem, action: (movie: TraktMovieListItem) => Promise<void>, message: string) => {
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
        searchBarPlaceholder="Search for movies"
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
      emptyViewTitle="Search for movies"
      searchBarPlaceholder="Search for movies"
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      throttle={true}
      pagination={pagination}
      items={movies}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => item.movie.title}
      subtitle={(item) => item.movie.year?.toString() || ""}
      poster={(item) => getPosterUrl(item.movie.images, "poster.png")}
      keyFn={(item, index) => `${item.movie.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Eye}
              title="View Details"
              target={
                <MovieDetail
                  movie={item}
                  onAddToWatchlist={(movie) => handleAction(movie, addMovieToWatchlist, "Movie added to watchlist")}
                  onAddToHistory={(movie) => handleAction(movie, addMovieToHistory, "Movie added to history")}
                />
              }
            />
            <Action
              title="Add to Watchlist"
              icon={Icon.Bookmark}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => handleAction(item, addMovieToWatchlist, "Movie added to watchlist")}
            />
            <Action
              title="Mark as Watched"
              icon={Icon.Checkmark}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => handleAction(item, addMovieToHistory, "Movie added to history")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("movies", item.movie.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(item.movie.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
