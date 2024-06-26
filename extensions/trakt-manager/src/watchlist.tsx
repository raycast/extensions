import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { MovieGridItems } from "./components/movie-grid";
import { ShowGridItems } from "./components/show-grid";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useShowDetails } from "./hooks/useShowDetails";
import { useWatchlistMovies } from "./hooks/useWatchlistMovies";
import { useWatchlistShows } from "./hooks/useWatchlistShows";

export default function Command() {
  const [page, setPage] = useState(1);
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [actionLoading, setActionLoading] = useState(false);

  const {
    movies,
    totalPages: totalMoviePages,
    removeMovieFromWatchlistMutation,
    checkInMovieMutation,
    error: movieError,
    success: movieSuccess,
  } = useWatchlistMovies(page, mediaType === "movie");
  const { details: movieDetails, error: movieDetailsError } = useMovieDetails(movies);

  const {
    shows,
    totalPages: totalShowPages,
    removeShowFromWatchlistMutation,
    checkInFirstEpisodeMutation,
    error: showError,
    success: showSuccess,
  } = useWatchlistShows(page, mediaType === "show");
  const { details: showDetails, error: showDetailsError } = useShowDetails(shows);

  const handleMovieAction = useCallback(
    async (movie: TraktMovieListItem, action: (movie: TraktMovieListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(movie);
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
    if (movieDetailsError) {
      showToast({
        title: movieDetailsError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [movieDetailsError]);

  useEffect(() => {
    if (showError) {
      showToast({
        title: showError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [showError]);

  useEffect(() => {
    if (showDetailsError) {
      showToast({
        title: showDetailsError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [showDetailsError]);

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

  const isLoading =
    actionLoading ||
    (mediaType === "movie"
      ? !(movies && movieDetails.size) && !(movieError || movieDetailsError)
      : !(shows && showDetails.size) && !(showError || showDetailsError));
  const totalPages = mediaType === "movie" ? totalMoviePages : totalShowPages;

  const onMediaTypeChange = (newValue: string) => {
    setMediaType(newValue as MediaType);
    setPage(1);
  };

  return (
    <Grid
      isLoading={isLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search watchlist"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
    >
      {mediaType === "movie" && (
        <>
          <Grid.EmptyView title="No movies in your watchlist" />
          <MovieGridItems
            movies={movies}
            movieDetails={movieDetails}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            primaryActionTitle="Remove from Watchlist"
            primaryActionIcon={Icon.Trash}
            primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
            primaryAction={(movie) => handleMovieAction(movie, removeMovieFromWatchlistMutation)}
            secondaryActionTitle="Check-in Movie"
            secondaryActionIcon={Icon.Checkmark}
            secondaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
            secondaryAction={(movie) => handleMovieAction(movie, checkInMovieMutation)}
          />
        </>
      )}
      {mediaType === "show" && (
        <>
          <Grid.EmptyView title="No shows in your watchlist" />
          <ShowGridItems
            shows={shows}
            showDetails={showDetails}
            subtitle={(show) => show.show.year?.toString() || ""}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            primaryActionTitle="Remove from Watchlist"
            primaryActionIcon={Icon.Trash}
            primaryActionShortcut={Keyboard.Shortcut.Common.Remove}
            primaryAction={(show) => handleShowAction(show, removeShowFromWatchlistMutation)}
            secondaryActionTitle="Check-in first episode"
            secondaryActionIcon={Icon.Checkmark}
            secondaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
            secondaryAction={(show) => handleShowAction(show, checkInFirstEpisodeMutation)}
          />
        </>
      )}
    </Grid>
  );
}
