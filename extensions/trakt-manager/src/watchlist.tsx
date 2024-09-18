import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { getWatchlistMovies } from "./api/movies";
import { getWatchlistShows } from "./api/shows";
import { MovieGrid } from "./components/movie-grid";
import { ShowGrid } from "./components/show-grid";
import { useMovieMutations } from "./hooks/useMovieMutations";
import { useShowMutations } from "./hooks/useShowMutations";
import { APP_MAX_LISTENERS } from "./lib/constants";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [actionLoading, setActionLoading] = useState(false);
  const {
    removeMovieFromWatchlistMutation,
    checkInMovieMutation,
    error: movieError,
    success: movieSuccess,
  } = useMovieMutations(abortable);
  const {
    removeShowFromWatchlistMutation,
    checkInFirstEpisodeMutation,
    error: showError,
    success: showSuccess,
  } = useShowMutations(abortable);
  const {
    isLoading: isMovieLoading,
    data: movies,
    pagination: moviePagination,
    revalidate: revalidateMovie,
  } = useCachedPromise(
    (mediaType: MediaType) => async (options: PaginationOptions) => {
      await setTimeout(200);
      if (mediaType === "show") {
        return { data: [], hasMore: false };
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      const pagedMovies = await getWatchlistMovies(options.page + 1, abortable.current?.signal);
      return { data: pagedMovies, hasMore: options.page < pagedMovies.total_pages };
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
    (mediaType: MediaType) => async (options: PaginationOptions) => {
      await setTimeout(200);
      if (mediaType === "movie") {
        return { data: [], hasMore: false };
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      const pagedMovies = await getWatchlistShows(options.page + 1, abortable.current?.signal);
      return { data: pagedMovies, hasMore: options.page < pagedMovies.total_pages };
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

  const onMediaTypeChange = useCallback((newValue: string) => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setMediaType(newValue as MediaType);
  }, []);

  const handleMovieAction = useCallback(
    async (movie: TraktMovieListItem, action: (movie: TraktMovieListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(movie);
        revalidateMovie();
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const handleShowAction = useCallback(
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(show);
        revalidateShow();
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (movieError) {
      showToast({
        title: movieError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [movieError]);

  useEffect(() => {
    if (showError) {
      showToast({
        title: showError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [showError]);

  useEffect(() => {
    if (movieSuccess) {
      showToast({
        title: movieSuccess,
        style: Toast.Style.Success,
      });
    }
  }, [movieSuccess]);

  useEffect(() => {
    if (showSuccess) {
      showToast({
        title: showSuccess,
        style: Toast.Style.Success,
      });
    }
  }, [showSuccess]);

  return mediaType === "movie" ? (
    <MovieGrid
      isLoading={isMovieLoading || actionLoading}
      emptyViewTitle="No movies in your watchlist"
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={moviePagination}
      movies={movies as TraktMovieList}
      primaryActionTitle="Remove from Watchlist"
      primaryActionIcon={Icon.Trash}
      primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
      primaryAction={(movie) => handleMovieAction(movie, removeMovieFromWatchlistMutation)}
      secondaryActionTitle="Check-in Movie"
      secondaryActionIcon={Icon.Checkmark}
      secondaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
      secondaryAction={(movie) => handleMovieAction(movie, checkInMovieMutation)}
    />
  ) : (
    <ShowGrid
      isLoading={isShowsLoading || actionLoading}
      emptyViewTitle="No shows in your watchlist"
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={showPagination}
      shows={shows as TraktShowList}
      subtitle={(show) => show.show.year?.toString() || ""}
      primaryActionTitle="Remove from Watchlist"
      primaryActionIcon={Icon.Trash}
      primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
      primaryAction={(show) => handleShowAction(show, removeShowFromWatchlistMutation)}
      secondaryActionTitle="Check-in first episode"
      secondaryActionIcon={Icon.Checkmark}
      secondaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
      secondaryAction={(show) => handleShowAction(show, checkInFirstEpisodeMutation)}
    />
  );
}
