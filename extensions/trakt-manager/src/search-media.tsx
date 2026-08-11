import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { type PaginationOptions } from "./lib/pagination";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { MovieActionPanel, ShowActionPanel } from "./components/media-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS } from "./lib/constants";
import { getPosterUrl } from "./lib/helper";
import {
  addMovieToHistory,
  addMovieToWatchlist,
  addShowToHistory,
  addShowToWatchlist,
  checkInFirstEpisodeToHistory,
} from "./lib/media-mutations";
import { TraktMovieListItem, TraktShowListItem, withPagination } from "./lib/schema";

type SearchMediaItem =
  { mediaType: "movie"; item: TraktMovieListItem } | { mediaType: "show"; item: TraktShowListItem };

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

  const addMovieToWatchlistAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await addMovieToWatchlist(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addMovieToHistoryAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await addMovieToHistory(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addShowToWatchlistAction = useCallback(
    async (show: TraktShowListItem) => {
      await addShowToWatchlist(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addShowToHistoryAction = useCallback(
    async (show: TraktShowListItem) => {
      await addShowToHistory(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const checkInFirstEpisodeToHistoryAction = useCallback(
    async (show: TraktShowListItem) => {
      await checkInFirstEpisodeToHistory(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const handleSearchTextChange = useCallback((text: string): void => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setSearchText(text);
  }, []);

  const runMovieAction = useActionRunner<TraktMovieListItem>({ setActionLoading });
  const runShowAction = useActionRunner<TraktShowListItem>({ setActionLoading });

  const movieActions = useCallback(
    (item: TraktMovieListItem) => (
      <MovieActionPanel
        item={item}
        actions={[
          {
            title: "Add to Watchlist",
            icon: Icon.Bookmark,
            shortcut: Keyboard.Shortcut.Common.Edit,
            onAction: (movie) => runMovieAction(movie, addMovieToWatchlistAction, "Movie added to watchlist"),
          },
          {
            title: "Add to History",
            icon: Icon.Clock,
            shortcut: Keyboard.Shortcut.Common.Duplicate,
            onAction: (movie) => runMovieAction(movie, addMovieToHistoryAction, "Movie added to history"),
          },
        ]}
      />
    ),
    [addMovieToHistoryAction, addMovieToWatchlistAction, runMovieAction],
  );

  const showActions = useCallback(
    (item: TraktShowListItem) => (
      <ShowActionPanel
        item={item}
        onCheckInFirstEpisode={(show) =>
          runShowAction(show, checkInFirstEpisodeToHistoryAction, "First episode checked-in")
        }
        actions={[
          {
            title: "Add to Watchlist",
            icon: Icon.Bookmark,
            shortcut: Keyboard.Shortcut.Common.Edit,
            onAction: (show) => runShowAction(show, addShowToWatchlistAction, "Show added to watchlist"),
          },
          {
            title: "Add to History",
            icon: Icon.Clock,
            shortcut: Keyboard.Shortcut.Common.Duplicate,
            onAction: (show) => runShowAction(show, addShowToHistoryAction, "Show added to history"),
          },
        ]}
      />
    ),
    [addShowToHistoryAction, addShowToWatchlistAction, checkInFirstEpisodeToHistoryAction, runShowAction],
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
