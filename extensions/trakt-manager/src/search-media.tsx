import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericDetail } from "./components/generic-detail";
import { GenericGrid } from "./components/generic-grid";
import { SeasonGrid } from "./components/season-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { createMovieMarkdown, createMovieMetadata } from "./lib/detail-helpers";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { TraktMovieListItem, TraktShowListItem, withPagination } from "./lib/schema";

type SearchMediaItem =
  | { mediaType: "movie"; item: TraktMovieListItem }
  | { mediaType: "show"; item: TraktShowListItem };

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: media,
    pagination,
  } = useCachedPromise(
    (searchText: string) => async (options: PaginationOptions) => {
      if (!searchText) return { data: [], hasMore: false };
      await setTimeout(200);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const fetchOptions = { signal: abortable.current.signal };
      const query = {
        query: searchText,
        page: options.page + 1,
        limit: 10,
        fields: "title" as const,
        extended: "full,cloud9" as const,
      };

      const [moviesResponse, showsResponse] = await Promise.all([
        traktClient.movies.searchMovies({ query, fetchOptions }),
        traktClient.shows.searchShows({ query, fetchOptions }),
      ]);

      const movies =
        moviesResponse.status === 200
          ? withPagination(moviesResponse)
          : { data: [] as TraktMovieListItem[], pagination: null };
      const shows =
        showsResponse.status === 200
          ? withPagination(showsResponse)
          : { data: [] as TraktShowListItem[], pagination: null };

      const merged: SearchMediaItem[] = [
        ...movies.data.map((item) => ({ mediaType: "movie" as const, item })),
        ...shows.data.map((item) => ({ mediaType: "show" as const, item })),
      ];

      const moviesHasMore =
        movies.pagination !== null &&
        movies.pagination["x-pagination-page"] < movies.pagination["x-pagination-page-count"];
      const showsHasMore =
        shows.pagination !== null &&
        shows.pagination["x-pagination-page"] < shows.pagination["x-pagination-page-count"];

      return {
        data: merged,
        hasMore: moviesHasMore || showsHasMore,
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

  const addShowToHistory = useCallback(async (show: TraktShowListItem) => {
    await traktClient.shows.addShowToHistory({
      body: {
        shows: [
          {
            ids: {
              trakt: show.show.ids.trakt,
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

  const handleMovieAction = useCallback(
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

  const handleShowAction = useCallback(
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

  const movieMarkdown = useCallback((movie: TraktMovieListItem) => {
    return createMovieMarkdown(movie.movie);
  }, []);

  const movieMetadata = useCallback((movie: TraktMovieListItem) => {
    return createMovieMetadata(movie);
  }, []);

  const movieActions = useCallback(
    (item: TraktMovieListItem) => (
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
            onAction={() => handleMovieAction(item, addMovieToWatchlist, "Movie added to watchlist")}
          />
          <Action
            title="Add to History"
            icon={Icon.Clock}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            onAction={() => handleMovieAction(item, addMovieToHistory, "Movie added to history")}
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
    ),
    [addMovieToHistory, addMovieToWatchlist, handleMovieAction, movieMarkdown, movieMetadata],
  );

  const showActions = useCallback(
    (item: TraktShowListItem) => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Switch}
            title="Browse Seasons"
            target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
          />
          <Action
            title="Check-In"
            icon={Icon.Checkmark}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={() => handleShowAction(item, checkInFirstEpisodeToHistory, "First episode checked-in")}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            icon={getFavicon(TRAKT_APP_URL)}
            title="Open in Trakt"
            url={getTraktUrl("shows", item.show.ids.slug)}
          />
          <Action.OpenInBrowser
            icon={getFavicon(IMDB_APP_URL)}
            title="Open in Imdb"
            url={getIMDbUrl(item.show.ids.imdb)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Add to Watchlist"
            icon={Icon.Bookmark}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => handleShowAction(item, addShowToWatchlist, "Show added to watchlist")}
          />
          <Action
            title="Add to History"
            icon={Icon.Clock}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            onAction={() => handleShowAction(item, addShowToHistory, "Show added to history")}
          />
        </ActionPanel.Section>
      </ActionPanel>
    ),
    [addShowToHistory, addShowToWatchlist, checkInFirstEpisodeToHistory, handleShowAction],
  );

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Search for movies and shows"
      searchBarPlaceholder="Search for movies and shows"
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
      pagination={pagination}
      items={media}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => (item.mediaType === "movie" ? item.item.movie.title : item.item.show.title)}
      subtitle={(item) => (item.mediaType === "show" ? item.item.show.year?.toString() || "" : "")}
      poster={(item) =>
        getPosterUrl(item.mediaType === "movie" ? item.item.movie.images : item.item.show.images, "poster.png")
      }
      keyFn={(item, index) =>
        `${item.mediaType}-${item.mediaType === "movie" ? item.item.movie.ids.trakt : item.item.show.ids.trakt}-${index}`
      }
      actions={(item) => (item.mediaType === "movie" ? movieActions(item.item) : showActions(item.item))}
    />
  );
}
