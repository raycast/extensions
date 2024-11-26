import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHistoryMovies } from "./api/movies";
import { getHistoryShows } from "./api/shows";
import { MovieGrid } from "./components/movie-grid";
import { ShowGrid } from "./components/show-grid";
import { useMovieMutations } from "./hooks/useMovieMutations";
import { useShowMutations } from "./hooks/useShowMutations";
import { APP_MAX_LISTENERS } from "./lib/constants";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [actionLoading, setActionLoading] = useState(false);
  const { removeMovieFromHistoryMutation, error: movieError, success: movieSuccess } = useMovieMutations(abortable);
  const { removeShowFromHistoryMutation, error: showError, success: showSuccess } = useShowMutations(abortable);
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
      const pagedMovies = await getHistoryMovies(options.page + 1, abortable.current?.signal);
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
      const pagedShows = await getHistoryShows(options.page + 1, abortable.current?.signal);
      return { data: pagedShows, hasMore: options.page < pagedShows.total_pages };
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
    if (movieSuccess) {
      showToast({
        title: movieSuccess,
        style: Toast.Style.Success,
      });
    }
  }, [movieSuccess]);

  useEffect(() => {
    if (showError) {
      showToast({
        title: showError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [showError]);

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
      emptyViewTitle="No movies in your history"
      searchBarPlaceholder="Search history"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={moviePagination}
      movies={movies as TraktMovieList}
      primaryActionTitle="Remove from history"
      primaryActionIcon={Icon.Trash}
      primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
      primaryAction={(movie) => handleMovieAction(movie, removeMovieFromHistoryMutation)}
    />
  ) : (
    <ShowGrid
      isLoading={isShowsLoading || actionLoading}
      emptyViewTitle="No shows in your history"
      searchBarPlaceholder="Search history"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
      pagination={showPagination}
      shows={shows as TraktShowList}
      subtitle={(show) => show.show.year?.toString() || ""}
      primaryActionTitle="Remove from history"
      primaryActionIcon={Icon.Trash}
      primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
      primaryAction={(show) => handleShowAction(show, removeShowFromHistoryMutation)}
    />
  );
}
