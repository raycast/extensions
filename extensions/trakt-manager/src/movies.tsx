import { Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { MovieGridItems } from "./components/movie-grid";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useMovies } from "./hooks/useMovies";

export default function Command() {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState<string | undefined>();
  const [actionLoading, setActionLoading] = useState(false);

  const {
    movies,
    addMovieToWatchlistMutation,
    checkInMovieMutation,
    addMovieToHistoryMutation,
    error,
    success,
    totalPages,
  } = useMovies(searchText, page);
  const { details: movieDetails, error: detailsError } = useMovieDetails(movies);

  const onSearchTextChange = useCallback((text: string): void => {
    setSearchText(text);
    setPage(1);
  }, []);

  const handleAction = useCallback(
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

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (detailsError) {
      showToast({
        title: detailsError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [detailsError]);

  useEffect(() => {
    if (success) {
      showToast({
        title: success,
        style: Toast.Style.Success,
      });
    }
  }, [success]);

  const isLoading = !!searchText && (!movies || !movieDetails.size || actionLoading) && !error && !detailsError;

  return (
    <Grid
      isLoading={isLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for movies"
      onSearchTextChange={onSearchTextChange}
      throttle={true}
    >
      <Grid.EmptyView title="Search for movies" />
      <MovieGridItems
        movies={movies}
        movieDetails={movieDetails}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        primaryActionTitle="Add to Watchlist"
        primaryActionIcon={Icon.Bookmark}
        primaryActionShortcut={Keyboard.Shortcut.Common.Edit}
        primaryAction={(movie) => handleAction(movie, addMovieToWatchlistMutation)}
        secondaryActionTitle="Check-in Movie"
        secondaryActionIcon={Icon.Checkmark}
        secondaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
        secondaryAction={(movie) => handleAction(movie, checkInMovieMutation)}
        tertiaryActionTitle="Add to History"
        tertiaryActionIcon={Icon.Clock}
        tertiaryActionShortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        tertiaryAction={(movie) => handleAction(movie, addMovieToHistoryMutation)}
      />
    </Grid>
  );
}
