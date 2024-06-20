import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { getHistoryMovies, removeMovieFromHistory } from "./api/movies";
import { getHistoryShows, removeShowFromHistory } from "./api/shows";
import { getTMDBMovieDetails, getTMDBShowDetails } from "./api/tmdb";
import { MovieGrid } from "./components/movie-grid";
import { ShowGrid } from "./components/show-grid";
import { APP_MAX_LISTENERS } from "./lib/constants";

export default function Command() {
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
      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      setIsLoading(true);
      if (mediaType === "show") {
        try {
          const showWatchlist = await getHistoryShows(page, abortable.current?.signal);
          setShows(showWatchlist);
          setPage(showWatchlist.page);
          setTotalPages(showWatchlist.total_pages);

          setMaxListeners(showWatchlist.length, abortable.current?.signal);
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
              title: "Error loading episodes",
              style: Toast.Style.Failure,
            });
          }
        }
      } else {
        try {
          const movieWatchlist = await getHistoryMovies(page, abortable.current?.signal);
          setMovies(movieWatchlist);
          setPage(movieWatchlist.page);
          setTotalPages(movieWatchlist.total_pages);

          setMaxListeners(movieWatchlist.length, abortable.current?.signal);
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
  }, [x, mediaType, page]);

  const onRemoveMovieFromHistory = async (movieId: number) => {
    setIsLoading(true);
    try {
      await removeMovieFromHistory(movieId, abortable.current?.signal);
      showToast({
        title: "Movie removed from history",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error removing movie from history",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
    forceRerender((value) => value + 1);
  };

  const onRemoveShowFromHistory = async (showId: number) => {
    setIsLoading(true);
    try {
      await removeShowFromHistory(showId, abortable.current?.signal);
      showToast({
        title: "Show removed from history",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error removing show from history",
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
      searchBarPlaceholder="Search history"
      searchBarAccessory={
        <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
          <Grid.Dropdown.Item value="movie" title="Movies" />
          <Grid.Dropdown.Item value="show" title="Shows" />
        </Grid.Dropdown>
      }
    >
      {mediaType === "movie" && (
        <>
          <Grid.EmptyView title="No movies in your history" />
          <MovieGrid
            movies={movies}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            historyActionTitle="Remove from History"
            historyActionIcon={Icon.Trash}
            historyActionShortcut={Keyboard.Shortcut.Common.Remove}
            historyAction={onRemoveMovieFromHistory}
          />
        </>
      )}
      {mediaType === "show" && (
        <>
          <Grid.EmptyView title="No shows in your history" />
          <ShowGrid
            shows={shows}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            historyActionTitle="Remove from History"
            historyActionIcon={Icon.Trash}
            historyActionShortcut={Keyboard.Shortcut.Common.Remove}
            historyAction={onRemoveShowFromHistory}
          />
        </>
      )}
    </Grid>
  );
}
