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
import { TraktMediaType, TraktMovieBaseItem, TraktShowBaseItem, withPagination } from "./lib/schema";

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

      const response = await traktClient.movies.getRecommendedMovies({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          ignore_collected: true,
          ignore_watchlisted: true,
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

      const response = await traktClient.shows.getRecommendedShows({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          ignore_collected: true,
          ignore_watchlisted: true,
        },
        fetchOptions: {
          signal: abortable.current.signal,
        },
      });

      if (response.status !== 200) throw new Error("Failed to fetch recommendations");
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

  const addMovieToWatchlist = useCallback(async (movie: TraktMovieBaseItem) => {
    await traktClient.movies.addMovieToWatchlist({
      body: {
        movies: [
          {
            ids: {
              trakt: movie.ids.trakt,
            },
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const addMovieToHistory = useCallback(async (movie: TraktMovieBaseItem) => {
    await traktClient.movies.addMovieToHistory({
      body: {
        movies: [
          {
            ids: {
              trakt: movie.ids.trakt,
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

  const addShowToWatchlist = useCallback(async (show: TraktShowBaseItem) => {
    await traktClient.shows.addShowToWatchlist({
      body: {
        shows: [
          {
            ids: {
              trakt: show.ids.trakt,
            },
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const addShowToHistory = useCallback(async (show: TraktShowBaseItem) => {
    await traktClient.shows.addShowToHistory({
      body: {
        shows: [
          {
            ids: {
              trakt: show.ids.trakt,
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

  const checkInFirstEpisodeToHistory = useCallback(async (show: TraktShowBaseItem) => {
    const response = await traktClient.shows.getEpisode({
      params: {
        showid: show.ids.trakt,
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

  const handleMovieAction = useCallback(
    async (movie: TraktMovieBaseItem, action: (movie: TraktMovieBaseItem) => Promise<void>, message: string) => {
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

  const movieMarkdown = useCallback((movie: TraktMovieBaseItem) => {
    return createMovieMarkdown(movie);
  }, []);

  const movieMetadata = useCallback((movie: TraktMovieBaseItem) => {
    return createMovieMetadata(movie);
  }, []);

  const handleShowAction = useCallback(
    async (show: TraktShowBaseItem, action: (show: TraktShowBaseItem) => Promise<void>, message: string) => {
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
      emptyViewTitle="No recommendations available"
      searchBarPlaceholder="Search recommendation"
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
      title={(item) => item.title}
      poster={(item) => getPosterUrl(item.images, "poster.png")}
      keyFn={(item, index) => `${item.ids.trakt}-${index}`}
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
                  navigationTitle={(movie) => movie.title}
                  actions={(movie) => (
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title="Add to Watchlist"
                          icon={Icon.Bookmark}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          onAction={() => handleMovieAction(movie, addMovieToWatchlist, "Movie added to watchlist")}
                        />
                        <Action
                          title="Add to History"
                          icon={Icon.Clock}
                          shortcut={Keyboard.Shortcut.Common.Duplicate}
                          onAction={() => handleMovieAction(movie, addMovieToHistory, "Movie added to history")}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          icon={getFavicon(TRAKT_APP_URL)}
                          title="Open in Trakt"
                          shortcut={Keyboard.Shortcut.Common.Open}
                          url={getTraktUrl("movies", movie.ids.slug)}
                        />
                        <Action.OpenInBrowser
                          icon={getFavicon(IMDB_APP_URL)}
                          title="Open in Imdb"
                          shortcut={{ modifiers: ["cmd"], key: "i" }}
                          url={getIMDbUrl(movie.ids.imdb)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  )}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={getTraktUrl("movies", item.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              url={getIMDbUrl(item.ids.imdb)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
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
        </ActionPanel>
      )}
    />
  ) : (
    <GenericGrid
      isLoading={isShowsLoading || actionLoading}
      emptyViewTitle="No recommendations available"
      searchBarPlaceholder="Search recommendation"
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
      title={(item) => item.title}
      poster={(item) => getPosterUrl(item.images, "poster.png")}
      keyFn={(item, index) => `${item.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Browse Seasons"
              target={<SeasonGrid showId={item.ids.trakt} slug={item.ids.slug} imdbId={item.ids.imdb} />}
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
              url={getTraktUrl("shows", item.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(item.ids.imdb)}
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
      )}
    />
  );
}
