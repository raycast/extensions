import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  parseBetaSeriesResponse,
} from "./api/client";
import { Movie } from "./types/betaseries";
import { MovieListItem } from "./components/MovieListItem";
import { TokenRequiredView } from "./components/TokenRequiredView";
import { useAuthToken } from "./hooks/useAuthToken";

export default function Command() {
  const [filter, setFilter] = useState("0"); // 0 = To Watch, 1 = Watched
  const { token, isLoading: isTokenLoading, setToken, logout } = useAuthToken();
  const tokenAvailable = Boolean(token);

  const { data: items = [], isLoading } = useFetch<
    { movies: Movie[] },
    Movie[],
    Movie[]
  >(buildBetaSeriesUrl("/movies/member", { limit: "100", state: filter }), {
    headers: getHeaders(token),
    execute: tokenAvailable && !isTokenLoading,
    keepPreviousData: true,
    initialData: [],
    parseResponse: (response) =>
      parseBetaSeriesResponse<{ movies: Movie[] }>(response),
    mapResult: (result) => ({ data: result.movies || [] }),
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load movies",
        message: error.message,
      });
    },
  });

  if (isTokenLoading) {
    return <List isLoading />;
  }

  if (!tokenAvailable) {
    return <TokenRequiredView onTokenSaved={setToken} />;
  }

  const handleLogout = async () => {
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out",
      message: "Your BetaSeries token has been removed.",
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue={true} onChange={setFilter}>
          <List.Dropdown.Item title="To Watch" value="0" />
          <List.Dropdown.Item title="Watched" value="1" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={filter === "0" ? "No movies to watch" : "No watched movies"}
        description="Your list is empty for this filter."
      />
      {items.map((movie) => (
        <MovieListItem
          key={movie.id}
          movie={movie}
          isMyMovie={true}
          onLogout={() => void handleLogout()}
        />
      ))}
    </List>
  );
}
