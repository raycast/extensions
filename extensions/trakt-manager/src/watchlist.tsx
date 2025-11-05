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
import { TraktMediaType, TraktMovieListItem, TraktShowListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [mediaType, setMediaType] = useState<TraktMediaType>("movie");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading: isMovieLoading,
    data: movies,
    pagination: moviePagination,
    revalidate: revalidateMovie,
  } = useCachedPromise(
    (mediaType: TraktMediaType) => async (options: PaginationOptions) => {
      if (mediaType === "show") return { data: [], hasMore: false };
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.movies.getWatchlistMovies({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          sort_by: "added",
          sort_how: "asc",
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
    [mediaType],
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
  const {
    isLoading: isShowsLoading,
    data: shows,
    pagination: showPagination,
    revalidate: revalidateShow,
  } = useCachedPromise(
    (mediaType: TraktMediaType) => async (options: PaginationOptions) => {
      if (mediaType === "movie") return { data: [], hasMore: false };
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.getWatchlistShows({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          sort_by: "added",
          sort_how: "asc",
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
    [mediaType],
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

  const removeShowFromWatchlist = useCallback(async (show: TraktShowListItem) => {
    await traktClient.shows.removeShowFromWatchlist({
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

  const removeMovieFromWatchlist = useCallback(async (movie: TraktMovieListItem) => {
    await traktClient.movies.removeMovieFromWatchlist({
      body: {
        movies: [
          {
            ids: {
              trakt: movie.movie.ids.trakt,
            },
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
            ids: {
              trakt: movie.movie.ids.trakt,
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

  const onMediaTypeChange = useCallback((newValue: string) => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setMediaType(newValue as TraktMediaType);
  }, []);

  const handleMovieAction = useCallback(
    async (movie: TraktMovieListItem, action: (movie: TraktMovieListItem) => Promise<void>, message: string) => {
      setActionLoading(true);
      try {
        await action(movie);
        revalidateMovie();
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
      } catch (error) {
        showToast({
          title: (error as Error).message,
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

  const handleShowAction = useCallback(
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>, message: string) => {
      setActionLoading(true);
      try {
        await action(show);
        revalidateShow();
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
      } catch (error) {
        showToast({
          title: (error as Error).message,
          style: Toast.Style.Failure,
        });
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  return mediaType === "movie" ? (
    <GenericGrid
      isLoading={isMovieLoading || actionLoading}
      emptyViewTitle="No watchlist available"
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={moviePagination}
      items={movies}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      poster={(item) => getPosterUrl(item.movie.images, "poster.png")}
      title={(item) => item.movie.title}
      subtitle={(item) => item.movie.year?.toString() || ""}
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
                        <Action
                          title="Add to History"
                          icon={Icon.Clock}
                          shortcut={Keyboard.Shortcut.Common.Duplicate}
                          onAction={() => handleMovieAction(movie, addMovieToHistory, "Movie added to history")}
                        />
                        <Action
                          title="Remove from Watchlist"
                          icon={Icon.Trash}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() =>
                            handleMovieAction(movie, removeMovieFromWatchlist, "Movie removed from watchlist")
                          }
                        />
                      </ActionPanel.Section>
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
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => handleMovieAction(item, addMovieToHistory, "Movie added to history")}
            />
            <Action
              title="Remove from Watchlist"
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleMovieAction(item, removeMovieFromWatchlist, "Movie removed from watchlist")}
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
  ) : (
    <GenericGrid
      isLoading={isShowsLoading || actionLoading}
      emptyViewTitle="No watchlist available"
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={showPagination}
      items={shows}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      poster={(item) => getPosterUrl(item.show.images, "poster.png")}
      title={(item) => item.show.title}
      subtitle={(item) => item.show.year?.toString() || ""}
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
              title="Check-in"
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
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => handleShowAction(item, addShowToHistory, "Show added to history")}
            />
            <Action
              title="Remove from Watchlist"
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleShowAction(item, removeShowFromWatchlist, "Show removed from watchlist")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
