import { ActionPanel, Icon, List, OpenInBrowserAction, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { MovieDetail } from "./detailMovie";
import { Movie, movieRating, movieTitle } from "./interfaces";
import { useSearch } from "./kinopoiskClient";

export default function ArticleList() {
  const [query, setQuery] = useState<string>("");
  const result = useSearch(query);

  if (result.error) {
    showToast(ToastStyle.Failure, "Cannot find movie", result.error);
  }
  return (
    <List
      isLoading={result.isLoading}
      throttle
      searchBarPlaceholder="Search movie by a keyword..."
      onSearchTextChange={setQuery}
    >
      {result.movies?.map((m) => (
        <MovieListItem key={m.filmId} movie={m} />
      ))}
    </List>
  );
}

function MovieListItem(props: { movie: Movie }) {
  const movie = props.movie;

  return (
    <List.Item
      title={`${movieTitle(movie)}`}
      subtitle={movieRating(movie)}
      icon={movie.posterUrlPreview}
      accessoryTitle={movie.year}
      actions={
        <ActionPanel>
          <PushAction title="Open Detail" target={<MovieDetail movie={movie} />} icon={Icon.ArrowRight} />
          <OpenInBrowserAction url={`https://www.kinopoisk.ru/film/${movie.filmId}/`} />
        </ActionPanel>
      }
    />
  );
}
