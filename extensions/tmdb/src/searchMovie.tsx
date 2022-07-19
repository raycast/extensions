import { useState } from "react";
import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { MovieDb } from "moviedb-promise";
import { MovieResponse } from "moviedb-promise/dist/./request-types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const STAR = "⭐";

  const prefrences = getPreferenceValues();
  const moviedb = new MovieDb(prefrences.apiKey);

  const searchMovie = async (query: string) => {
    setIsLoading(true);
    moviedb
      .searchMovie({ query: query })
      .then((res: any) => {
        setMovies(res.results);
        setIsLoading(false);
      })
      .catch((err: any) => {
        // console.log(err);
        setIsLoading(false);
      });
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      throttle
      onSearchTextChange={(query: string) => {
        searchMovie(query);
      }}
    >
      {!isLoading &&
        movies.map((movie: MovieResponse) => (
          <List.Item
            key={`${movie.id}+${movie.backdrop_path ?? ""}`}
            icon={`https://image.tmdb.org/t/p/w200/${movie.poster_path}`}
            title={movie.original_title ?? "Unknwon Show"}
            detail={
              <List.Item.Detail
                markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${movie.backdrop_path})
                ${movie.overview ?? ""}
                `}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Title"
                      text={movie.title ?? movie.original_title ?? "Unknwon"}
                    />
                    <List.Item.Detail.Metadata.Label title="Release Date" text={movie.release_date ?? "Unknwon"} />
                    <List.Item.Detail.Metadata.Label
                      title="Rating"
                      text={`${STAR.repeat(Math.round((movie.vote_average ?? 0) / 2))}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Vote Average" text={`${movie.vote_average ?? 0.0}`} />
                    <List.Item.Detail.Metadata.Label title="Vote Count" text={`${movie.vote_count ?? 0}`} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.themoviedb.org/movie/${movie.id ?? 0}`} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
