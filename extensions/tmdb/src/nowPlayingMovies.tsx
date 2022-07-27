import { useState, useEffect } from "react";
import { ActionPanel, Action, Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MovieDb } from "moviedb-promise";
import { MovieResult } from "moviedb-promise/dist/./request-types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [page, setPage] = useState("1");
  const STAR = "⭐";

  const prefrences = getPreferenceValues();
  const moviedb = new MovieDb(prefrences.apiKey);

  const fetchMovie = async (page: string) => {
    moviedb
      .movieNowPlaying({ page: Number(page) })
      .then((res: any) => {
        setMovies(res.results);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: `${err}` });
      });
  };
  useEffect(() => {
    fetchMovie(page);
  }, []);

  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Medium}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Page Number"
          onChange={(newValue) => {
            setPage(newValue);
            fetchMovie(newValue);
          }}
          storeValue
        >
          <Grid.Dropdown.Section title="Pages">
            {Array.from(Array(10).keys()).map((i) => (
              <Grid.Dropdown.Item key={i} title={`Page ${i + 1}`} value={`${i + 1}`} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        movies.map((movie: MovieResult) => (
          <Grid.Item
            key={movie.poster_path}
            content={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
            title={movie.original_title}
            subtitle={`${movie.vote_average ?? 0.0} ${STAR.repeat(Math.round((movie.vote_average ?? 0) / 2))}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.themoviedb.org/movie/${movie.id ?? 0}`} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
