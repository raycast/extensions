import { List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  parseBetaSeriesResponse,
} from "./api/client";
import { Movie } from "./types/betaseries";
import { MovieListItem } from "./components/MovieListItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const shouldSearch = searchText.trim().length > 0;

  const { data: items = [], isLoading } = useFetch<
    { movies: Movie[] },
    Movie[],
    Movie[]
  >(buildBetaSeriesUrl("/movies/search", { title: searchText }), {
    headers: getHeaders(),
    execute: shouldSearch,
    keepPreviousData: shouldSearch,
    initialData: [],
    parseResponse: (response) =>
      parseBetaSeriesResponse<{ movies: Movie[] }>(response),
    mapResult: (result) => ({ data: result.movies || [] }),
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Movies..."
      throttle
    >
      {items.map((movie) => (
        <MovieListItem key={movie.id} movie={movie} />
      ))}
    </List>
  );
}
