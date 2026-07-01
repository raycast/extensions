import { Grid, Icon, Keyboard } from "@raycast/api";
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
import { fetchCombinedMediaPage, fetchMediaPage, mediaListCacheOptions } from "./lib/media-pagination";
import {
  addMovieToHistory,
  addShowToHistory,
  checkInFirstEpisodeToHistory,
  removeMovieFromWatchlist,
  removeShowFromWatchlist,
} from "./lib/media-mutations";
import { TraktMovieListItem, TraktShowListItem } from "./lib/schema";

type WatchlistFilterType = "all" | "movie" | "show";

type WatchlistItem = { mediaType: "movie"; item: TraktMovieListItem } | { mediaType: "show"; item: TraktShowListItem };

const watchlistQuery = {
  limit: 10,
  extended: "full,cloud9" as const,
  sort_by: "added" as const,
};
const combinedWatchlistPageLimit = watchlistQuery.limit * 2;

const sortByListedAt = (items: WatchlistItem[]) =>
  [...items].sort((a, b) => {
    const aTime = a.item.listed_at ? new Date(a.item.listed_at).getTime() : 0;
    const bTime = b.item.listed_at ? new Date(b.item.listed_at).getTime() : 0;
    return bTime - aTime;
  });

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [mediaType, setMediaType] = useState<WatchlistFilterType>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: watchlist,
    pagination,
    revalidate,
  } = useCachedPromise(
    (mediaType: WatchlistFilterType) => async (options: PaginationOptions) => {
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const fetchOptions = { signal: abortable.current.signal };
      const page = options.page + 1;
      const sortHow = mediaType === "all" ? ("desc" as const) : ("asc" as const);
      const query = { ...watchlistQuery, page, sort_how: sortHow };

      if (mediaType === "movie") {
        return fetchMediaPage<"movie", TraktMovieListItem>("movie", () =>
          traktClient.movies.getWatchlistMovies({ query, fetchOptions }),
        );
      }

      if (mediaType === "show") {
        return fetchMediaPage<"show", TraktShowListItem>("show", () =>
          traktClient.shows.getWatchlistShows({ query, fetchOptions }),
        );
      }

      return fetchCombinedMediaPage<TraktMovieListItem, TraktShowListItem>({
        page: options.page,
        perPageLimit: watchlistQuery.limit,
        combinedPageLimit: combinedWatchlistPageLimit,
        requestMoviePage: (page) => traktClient.movies.getWatchlistMovies({ query: { ...query, page }, fetchOptions }),
        requestShowPage: (page) => traktClient.shows.getWatchlistShows({ query: { ...query, page }, fetchOptions }),
        sort: sortByListedAt,
      });
    },
    [mediaType],
    mediaListCacheOptions(abortable),
  );

  const removeShowFromWatchlistAction = useCallback(
    async (show: TraktShowListItem) => {
      await removeShowFromWatchlist(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const removeMovieFromWatchlistAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await removeMovieFromWatchlist(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addMovieToHistoryAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await addMovieToHistory(traktClient, movie, { signal: abortable.current?.signal });
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

  const onMediaTypeChange = useCallback((newValue: string) => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setMediaType(newValue as WatchlistFilterType);
  }, []);

  const runMovieAction = useActionRunner<TraktMovieListItem>({ setActionLoading, onSuccess: revalidate });
  const runShowAction = useActionRunner<TraktShowListItem>({ setActionLoading, onSuccess: revalidate });

  const movieActions = useCallback(
    (item: TraktMovieListItem) => (
      <MovieActionPanel
        item={item}
        actions={[
          {
            title: "Add to History",
            icon: Icon.Clock,
            shortcut: Keyboard.Shortcut.Common.Duplicate,
            onAction: (movie) => runMovieAction(movie, addMovieToHistoryAction, "Movie added to history"),
          },
          {
            title: "Remove from Watchlist",
            icon: Icon.Trash,
            shortcut: Keyboard.Shortcut.Common.Remove,
            onAction: (movie) => runMovieAction(movie, removeMovieFromWatchlistAction, "Movie removed from watchlist"),
          },
        ]}
      />
    ),
    [addMovieToHistoryAction, removeMovieFromWatchlistAction, runMovieAction],
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
            title: "Add to History",
            icon: Icon.Clock,
            shortcut: Keyboard.Shortcut.Common.Duplicate,
            onAction: (show) => runShowAction(show, addShowToHistoryAction, "Show added to history"),
          },
          {
            title: "Remove from Watchlist",
            icon: Icon.Trash,
            shortcut: Keyboard.Shortcut.Common.Remove,
            onAction: (show) => runShowAction(show, removeShowFromWatchlistAction, "Show removed from watchlist"),
          },
        ]}
      />
    ),
    [addShowToHistoryAction, checkInFirstEpisodeToHistoryAction, removeShowFromWatchlistAction, runShowAction],
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
      emptyViewTitle="No watchlist available"
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      items={watchlist}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => (item.mediaType === "movie" ? item.item.movie.title : item.item.show.title)}
      subtitle={(item) =>
        item.mediaType === "movie" ? item.item.movie.year?.toString() || "" : item.item.show.year?.toString() || ""
      }
      poster={(item) =>
        getPosterUrl(item.mediaType === "movie" ? item.item.movie.images : item.item.show.images, "poster.png")
      }
      keyFn={(item, index) =>
        item.mediaType === "movie" ? `${item.item.movie.ids.trakt}-${index}` : `${item.item.show.ids.trakt}-${index}`
      }
      actions={(item) => (item.mediaType === "movie" ? movieActions(item.item) : showActions(item.item))}
    />
  );
}
