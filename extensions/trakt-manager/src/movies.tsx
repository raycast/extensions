import { Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { MovieGrid } from "./components/movie-grid";
import { View } from "./components/view";
import { addMovieToHistory, addMovieToWatchlist, checkInMovie, searchMovies } from "./services/movies";
import { getTMDBMovieDetails } from "./services/tmdb";

function SearchCommand() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string | undefined>();
  const [movies, setMovies] = useState<TraktMovieList | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(20, abortable.current?.signal);
      if (!searchText) {
        setMovies(undefined);
      } else {
        setIsLoading(true);
        try {
          const movies = await searchMovies(searchText, page, abortable.current.signal);
          setMovies(movies);
          setPage(movies.page);
          setTotalPages(movies.total_pages);

          const moviesWithImages = (await Promise.all(
            movies.map(async (movie) => {
              movie.movie.details = await getTMDBMovieDetails(movie.movie.ids.tmdb, abortable.current?.signal);
              return movie;
            }),
          )) as TraktMovieList;

          setMovies(moviesWithImages);
        } catch (e) {
          if (!(e instanceof AbortError)) {
            showToast({
              title: "Error searching movies",
              style: Toast.Style.Failure,
            });
          }
        }
        setIsLoading(false);
      }
    })();
  }, [searchText, page]);

  const onAddMovieToWatchlist = async (movieId: number) => {
    setIsLoading(true);
    try {
      await addMovieToWatchlist(movieId, abortable.current?.signal);
      showToast({
        title: "Movie added to watchlist",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error adding movie to watchlist",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
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
  };

  const onAddMovieToHistory = async (movieId: number) => {
    setIsLoading(true);
    try {
      await addMovieToHistory(movieId, abortable.current?.signal);
      showToast({
        title: "Movie added to history",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error adding movie to history",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
  };

  const onSearchTextChange = (text: string): void => {
    setSearchText(text);
    setPage(1);
    setTotalPages(1);
  };

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
      <MovieGrid
        movies={movies}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        checkInAction={onCheckInMovie}
        watchlistActionTitle={"Add to Watchlist"}
        watchlistActionIcon={Icon.Bookmark}
        watchlistActionShortcut={Keyboard.Shortcut.Common.Edit}
        watchlistAction={onAddMovieToWatchlist}
        historyActionTitle="Add to History"
        historyActionIcon={Icon.Clock}
        historyActionShortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        historyAction={onAddMovieToHistory}
      />
    </Grid>
  );
}

export default function Command() {
  return (
    <View>
      <SearchCommand />
    </View>
  );
}
