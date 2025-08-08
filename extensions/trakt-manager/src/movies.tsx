import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericDetail } from "./components/generic-detail";
import { GenericGrid } from "./components/generic-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { createMovieMarkdown, createMovieMetadata } from "./lib/detail-helpers";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { TraktMovieListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: movies,
    pagination,
  } = useCachedPromise(
    (searchText: string) => async (options: PaginationOptions) => {
      if (!searchText) return { data: [], hasMore: false };
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.movies.searchMovies({
        query: {
          query: searchText,
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
    [searchText],
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

  const movieMarkdown = useCallback((movie: TraktMovieListItem) => {
    return createMovieMarkdown(movie.movie);
  }, []);

  const movieMetadata = useCallback((movie: TraktMovieListItem) => {
    return createMovieMetadata(movie);
  }, []);

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Search for movies"
      searchBarPlaceholder="Search for movies"
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
      pagination={pagination}
      items={movies}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => item.movie.title}
      poster={(item) => getPosterUrl(item.movie.images, "poster.png")}
      keyFn={(item, index) => `${item.movie.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Eye}
              title="View Details"
              target={
                <GenericDetail
                  item={item}
                  isLoading={false}
                  markdown={movieMarkdown}
                  metadata={movieMetadata}
                  navigationTitle={(movie) => movie.movie.title}
                  actions={(movie) => (
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          icon={getFavicon(TRAKT_APP_URL)}
                          title="Open in Trakt"
                          shortcut={Keyboard.Shortcut.Common.Open}
                          url={getTraktUrl("movies", movie.movie.ids.slug)}
                        />
                        <Action.OpenInBrowser
                          icon={getFavicon(IMDB_APP_URL)}
                          title="Open in Imdb"
                          shortcut={{ modifiers: ["cmd"], key: "i" }}
                          url={getIMDbUrl(movie.movie.ids.imdb)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  )}
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
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
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
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              url={getIMDbUrl(item.movie.ids.imdb)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
