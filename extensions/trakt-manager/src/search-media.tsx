import { Grid, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { type PaginationOptions } from "./lib/pagination";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { MovieActionPanel, ShowActionPanel } from "./components/media-actions";
import { MovieSearchActions, ShowSearchActions } from "./components/search-item-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS } from "./lib/constants";
import { getPosterUrl } from "./lib/helper";
import { markFirstEpisodeWatched } from "./lib/media-mutations";
import { TraktMovieListItem, TraktShowListItem, withPagination } from "./lib/schema";
import { useCheckinSync } from "./lib/use-checkin-state";
import { useRatingsSync } from "./lib/use-ratings";
import { useWatchedState, useWatchedSync } from "./lib/use-watched";
import { useWatchlistSync } from "./lib/use-watchlist-ids";

type SearchMediaItem =
  { mediaType: "movie"; item: TraktMovieListItem } | { mediaType: "show"; item: TraktShowListItem };

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  useWatchlistSync();
  useRatingsSync();
  useWatchedSync();
  const { setWatched } = useWatchedState();
  useCheckinSync();
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

  const markFirstEpisodeWatchedAction = useCallback(
    async (show: TraktShowListItem) => {
      await markFirstEpisodeWatched(traktClient, show.show.ids.trakt, { signal: abortable.current?.signal });
      const showId = show.show.ids.trakt;
      setWatched({ type: "show", traktId: showId }, true);
      setWatched({ type: "episode", showId, season: 1, number: 1 }, true);
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

  const movieActions = (item: TraktMovieListItem) => (
    <MovieActionPanel
      item={item}
      actions={[]}
      actionItems={(movie) => (
        <MovieSearchActions
          item={movie}
          client={traktClient}
          signal={() => abortable.current?.signal}
          run={runMovieAction}
        />
      )}
    />
  );

  const showActions = (item: TraktShowListItem) => (
    <ShowActionPanel
      item={item}
      onMarkFirstEpisodeWatched={(show) =>
        runShowAction(show, markFirstEpisodeWatchedAction, "First episode marked as watched")
      }
      actions={[]}
      actionItems={
        <ShowSearchActions
          item={item}
          client={traktClient}
          signal={() => abortable.current?.signal}
          run={runShowAction}
        />
      }
    />
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
