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
import {
  createEpisodeMarkdown,
  createEpisodeMetadata,
  createMovieMarkdown,
  createMovieMetadata,
} from "./lib/detail-helpers";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { TraktMediaType, TraktMovieHistoryListItem, TraktShowHistoryListItem, withPagination } from "./lib/schema";

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

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
      await setTimeout(100);
      if (mediaType === "show") return { data: [], hasMore: false };

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.movies.getMovieHistory({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          sort_by: "added",
          sort_how: "desc",
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
      await setTimeout(100);
      if (mediaType === "movie") return { data: [], hasMore: false };

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.getShowHistory({
        query: {
          page: options.page + 1,
          limit: 10,
          extended: "full,cloud9",
          sort_by: "added",
          sort_how: "desc",
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

  const removeMovieFromHistory = useCallback(async (movie: TraktMovieHistoryListItem) => {
    await traktClient.movies.removeMovieFromHistory({
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

  const removeEpisodeFromHistory = useCallback(async (episode: TraktShowHistoryListItem) => {
    await traktClient.shows.removeEpisodeFromHistory({
      body: {
        episodes: [
          {
            ids: {
              trakt: episode.episode.ids.trakt,
            },
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
    async (
      movie: TraktMovieHistoryListItem,
      action: (movie: TraktMovieHistoryListItem) => Promise<void>,
      message: string,
    ) => {
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

  const handleShowAction = useCallback(
    async (
      episode: TraktShowHistoryListItem,
      action: (episode: TraktShowHistoryListItem) => Promise<void>,
      message: string,
    ) => {
      setActionLoading(true);
      try {
        await action(episode);
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

  const movieMarkdown = useCallback((movie: TraktMovieHistoryListItem) => {
    return createMovieMarkdown(movie.movie);
  }, []);

  const movieMetadata = useCallback((movie: TraktMovieHistoryListItem) => {
    return createMovieMetadata(movie);
  }, []);

  return mediaType === "movie" ? (
    <GenericGrid
      isLoading={isMovieLoading || actionLoading}
      emptyViewTitle="No history available"
      searchBarPlaceholder="Search history"
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
      subtitle={(item) => (item.watched_at ? `${formatter.format(new Date(item.watched_at))}` : "")}
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
          <ActionPanel.Section>
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleMovieAction(item, removeMovieFromHistory, "Movie removed from history")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  ) : (
    <GenericGrid
      isLoading={isShowsLoading || actionLoading}
      emptyViewTitle="No history available"
      searchBarPlaceholder="Search history"
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
      title={(item) => `${item.show.title} - ${item.episode.title}`}
      subtitle={(item) =>
        `${item.episode.season}x${item.episode.number.toString().padStart(2, "0")}${
          item.watched_at ? ` - ${formatter.format(new Date(item.watched_at))}` : ""
        }`
      }
      keyFn={(item, index) => `${item.show.ids.trakt}-${item.episode.ids.trakt}-${index}`}
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
                  markdown={(item) =>
                    // Use the episode and show objects for markdown
                    createEpisodeMarkdown(item.episode, item.show)
                  }
                  metadata={(item) => createEpisodeMetadata(item.episode, item.show)}
                  navigationTitle={(item) =>
                    `${item.show.title} - S${item.episode.season}E${item.episode.number.toString().padStart(2, "0")}`
                  }
                  actions={(item) => (
                    <ActionPanel>
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() =>
                          handleShowAction(item, removeEpisodeFromHistory, "Episode removed from history")
                        }
                      />
                      <Action.OpenInBrowser
                        icon={getFavicon(TRAKT_APP_URL)}
                        title="Open in Trakt"
                        url={getTraktUrl("episode", item.show.ids.slug, item.episode.season, item.episode.number)}
                      />
                      <Action.OpenInBrowser
                        icon={getFavicon(IMDB_APP_URL)}
                        title="Open in Imdb"
                        url={getIMDbUrl(item.episode.ids.imdb)}
                      />
                    </ActionPanel>
                  )}
                />
              }
            />
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => handleShowAction(item, removeEpisodeFromHistory, "Episode removed from history")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
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
