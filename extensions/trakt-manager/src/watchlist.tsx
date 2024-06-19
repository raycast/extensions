import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./components/auth";
import { MovieGrid } from "./components/movie-grid";
import { ShowGrid } from "./components/show-grid";
import { checkInMovie, getWatchlistMovies, removeMovieFromWatchlist } from "./services/movies";
import { getWatchlistShows, removeShowFromWatchlist } from "./services/shows";
import { getTMDBMovieDetails, getTMDBShowDetails } from "./services/tmdb";

const WatchlistCommand = () => {
  const { isAuthenticated } = useAuth();
  const abortable = useRef<AbortController>();
  const [movies, setMovies] = useState<TraktMovieList | undefined>();
  const [shows, setShows] = useState<TraktShowList | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mediaType, setMediaType] = useState("movie");
  const [x, forceRerender] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        return;
      }

      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(20, abortable.current?.signal);
      setIsLoading(true);
      if (mediaType === "show") {
        try {
          const showWatchlist = await getWatchlistShows(page, abortable.current?.signal);
          setShows(showWatchlist);
          setPage(showWatchlist.page);
          setTotalPages(showWatchlist.total_pages);

          const showsWithImages = (await Promise.all(
            showWatchlist.map(async (movie) => {
              movie.show.details = await getTMDBShowDetails(movie.show.ids.tmdb, abortable.current?.signal);
              return movie;
            }),
          )) as TraktShowList;

          setShows(showsWithImages);
        } catch (e) {
          if (!(e instanceof AbortError)) {
            showToast({
              title: "Error loading shows",
              style: Toast.Style.Failure,
            });
          }
        }
      } else {
        try {
          const movieWatchlist = await getWatchlistMovies(page, abortable.current?.signal);
          setMovies(movieWatchlist);
          setPage(movieWatchlist.page);
          setTotalPages(movieWatchlist.total_pages);

          const moviesWithImages = (await Promise.all(
            movieWatchlist.map(async (movie) => {
              movie.movie.details = await getTMDBMovieDetails(movie.movie.ids.tmdb, abortable.current?.signal);
              return movie;
            }),
          )) as TraktMovieList;

          setMovies(moviesWithImages);
        } catch (e) {
          if (!(e instanceof AbortError)) {
            showToast({
              title: "Error loading movies",
              style: Toast.Style.Failure,
            });
          }
        }
      }
      setIsLoading(false);
      return () => {
        if (abortable.current) {
          abortable.current.abort();
        }
      };
    })();
  }, [isAuthenticated, x, mediaType, page]);

  const onRemoveMovieFromWatchlist = async (movieId: number) => {
    setIsLoading(true);
    try {
      await removeMovieFromWatchlist(movieId, abortable.current?.signal);
      showToast({
        title: "Movie removed from watchlist",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error removing movie from watchlist",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
    forceRerender((value) => value + 1);
  };

  const onRemoveShowFromWatchlist = async (showId: number) => {
    setIsLoading(true);
    try {
      await removeShowFromWatchlist(showId, abortable.current?.signal);
      showToast({
        title: "Show removed from watchlist",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error removing show from watchlist",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
    forceRerender((value) => value + 1);
  };

  const onCheckInMovie = async (movieId: number) => {
    setIsLoading(true);
    try {
      await checkInMovie(movieId, abortable.current?.signal);
      showToast({
        title: "Movie checked in",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error checking in movie",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
    forceRerender((value) => value + 1);
  };

  const onMediaTypeChange = (newValue: string) => {
    setMediaType(newValue);
    setPage(1);
    setTotalPages(1);
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
          <MovieGrid
            movies={movies}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            checkInAction={onCheckInMovie}
            watchlistActionTitle="Remove from Watchlist"
            watchlistAction={onRemoveMovieFromWatchlist}
            watchlistActionIcon={Icon.Trash}
            watchlistActionShortcut={Keyboard.Shortcut.Common.Remove}
          />
        </>
      )}
      {mediaType === "show" && (
        <>
          <Grid.EmptyView title="No shows in your watchlist" />
          <ShowGrid
            shows={shows}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            watchlistActionTitle="Remove from Watchlist"
            watchlistAction={onRemoveShowFromWatchlist}
            watchlistActionIcon={Icon.Trash}
            watchlistActionShortcut={Keyboard.Shortcut.Common.Remove}
          />
        </>
      )}
    </Grid>
  );
};

export default function Command() {
  return (
    <AuthProvider>
      <WatchlistCommand />
    </AuthProvider>
  );
}
