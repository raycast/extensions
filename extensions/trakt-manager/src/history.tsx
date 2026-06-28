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
import { TraktMovieHistoryListItem, TraktShowHistoryListItem, withPagination } from "./lib/schema";

type HistoryFilterType = "all" | "movie" | "show";

type HistoryItem =
  | { mediaType: "movie"; item: TraktMovieHistoryListItem }
  | { mediaType: "show"; item: TraktShowHistoryListItem };

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

const historyQuery = {
  limit: 10,
  extended: "full,cloud9" as const,
  sort_by: "added" as const,
  sort_how: "desc" as const,
};

const sortByWatchedAt = (items: HistoryItem[]) =>
  [...items].sort((a, b) => {
    const aTime = a.item.watched_at ? new Date(a.item.watched_at).getTime() : 0;
    const bTime = b.item.watched_at ? new Date(b.item.watched_at).getTime() : 0;
    return bTime - aTime;
  });

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [mediaType, setMediaType] = useState<HistoryFilterType>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: history,
    pagination,
    revalidate,
  } = useCachedPromise(
    (mediaType: HistoryFilterType) => async (options: PaginationOptions) => {
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const fetchOptions = { signal: abortable.current.signal };
      const page = options.page + 1;

      if (mediaType === "movie") {
        const response = await traktClient.movies.getMovieHistory({
          query: { ...historyQuery, page },
          fetchOptions,
        });

        if (response.status !== 200) return { data: [], hasMore: false };
        const paginatedResponse = withPagination(response);

        return {
          data: paginatedResponse.data.map((item) => ({ mediaType: "movie" as const, item })),
          hasMore:
            paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
        };
      }

      if (mediaType === "show") {
        const response = await traktClient.shows.getShowHistory({
          query: { ...historyQuery, page },
          fetchOptions,
        });

        if (response.status !== 200) return { data: [], hasMore: false };
        const paginatedResponse = withPagination(response);

        return {
          data: paginatedResponse.data.map((item) => ({ mediaType: "show" as const, item })),
          hasMore:
            paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
        };
      }

      const [moviesResponse, showsResponse] = await Promise.all([
        traktClient.movies.getMovieHistory({ query: { ...historyQuery, page }, fetchOptions }),
        traktClient.shows.getShowHistory({ query: { ...historyQuery, page }, fetchOptions }),
      ]);

      const movies =
        moviesResponse.status === 200
          ? withPagination(moviesResponse)
          : { data: [] as TraktMovieHistoryListItem[], pagination: null };
      const shows =
        showsResponse.status === 200
          ? withPagination(showsResponse)
          : { data: [] as TraktShowHistoryListItem[], pagination: null };

      const merged = sortByWatchedAt([
        ...movies.data.map((item) => ({ mediaType: "movie" as const, item })),
        ...shows.data.map((item) => ({ mediaType: "show" as const, item })),
      ]);

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
    setMediaType(newValue as HistoryFilterType);
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
        revalidate();
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
    [revalidate],
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
        revalidate();
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
    [revalidate],
  );

  const movieMarkdown = useCallback((movie: TraktMovieHistoryListItem) => {
    return createMovieMarkdown(movie.movie);
  }, []);

  const movieMetadata = useCallback((movie: TraktMovieHistoryListItem) => {
    return createMovieMetadata(movie);
  }, []);

  const movieActions = useCallback(
    (item: TraktMovieHistoryListItem) => (
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
    ),
    [handleMovieAction, movieMarkdown, movieMetadata, removeMovieFromHistory],
  );

  const showActions = useCallback(
    (item: TraktShowHistoryListItem) => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Eye}
            title="View Details"
            target={
              <GenericDetail
                item={item}
                isLoading={false}
                markdown={(item) => createEpisodeMarkdown(item.episode, item.show)}
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
                      onAction={() => handleShowAction(item, removeEpisodeFromHistory, "Episode removed from history")}
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
    ),
    [handleShowAction, removeEpisodeFromHistory],
  );

  const searchBarAccessory = (
    <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
      <Grid.Dropdown.Item value="all" title="All" />
      <Grid.Dropdown.Item value="movie" title="Movies" />
      <Grid.Dropdown.Item value="show" title="Shows" />
    </Grid.Dropdown>
  );

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="No history available"
      searchBarPlaceholder="Search history"
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      items={history}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) =>
        item.mediaType === "movie" ? item.item.movie.title : `${item.item.show.title} - ${item.item.episode.title}`
      }
      subtitle={(item) => {
        const watchedAt = item.item.watched_at ? formatter.format(new Date(item.item.watched_at)) : "";
        if (item.mediaType === "movie") {
          return watchedAt;
        }
        const episodeLabel = `${item.item.episode.season}x${item.item.episode.number.toString().padStart(2, "0")}`;
        return watchedAt ? `${episodeLabel} - ${watchedAt}` : episodeLabel;
      }}
      poster={(item) =>
        getPosterUrl(item.mediaType === "movie" ? item.item.movie.images : item.item.show.images, "poster.png")
      }
      keyFn={(item, index) =>
        item.mediaType === "movie"
          ? `${item.item.movie.ids.trakt}-${index}`
          : `${item.item.show.ids.trakt}-${item.item.episode.ids.trakt}-${index}`
      }
      actions={(item) => (item.mediaType === "movie" ? movieActions(item.item) : showActions(item.item))}
    />
  );
}
