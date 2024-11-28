import { useState } from "react";
import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "./api";
import { MovieResponse, ShowResponse } from "moviedb-promise";
import { format } from "date-fns";
import MovieDetail from "./components/MovieDetail";
import TvShowDetail from "./components/TvShowDetail";
import Posters from "./components/Posters";
import Backdrops from "./components/Backdrops";

export default function Command() {
  const [query, setQuery] = useState("");

  const { data: trendingResults, isLoading: isLoadingTrendingResults } = useCachedPromise(async () => {
    const results = await moviedb.trending({ media_type: "all", time_window: "day" });
    return results.results;
  });

  const { data: searchResults, isLoading: isLoadingSearchResults } = useCachedPromise(
    async (query) => {
      const results = await moviedb.searchMulti({ query });
      return results.results;
    },
    [query],
    { execute: query.length > 0, keepPreviousData: true },
  );

  const showTrendingSection = !searchResults || searchResults.length === 0 || query.length === 0;

  return (
    <List
      isLoading={isLoadingTrendingResults || isLoadingSearchResults}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail
      searchBarPlaceholder="Search for a movie or a TV show"
    >
      {showTrendingSection ? (
        <List.Section title="Trending">
          {trendingResults?.map((result) => {
            if (result.media_type === "movie") {
              return <Movie key={result.id} movie={result} />;
            }

            if (result.media_type === "tv") {
              return <Show key={result.id} show={result} />;
            }

            return null;
          })}
        </List.Section>
      ) : null}

      <List.Section title="Search Results">
        {searchResults?.map((result) => {
          if (result.media_type === "movie") {
            return <Movie key={result.id} movie={result} />;
          }

          if (result.media_type === "tv") {
            return <Show key={result.id} show={result} />;
          }

          return null;
        })}
      </List.Section>
    </List>
  );
}

function Movie({ movie }: { movie: MovieResponse }) {
  const title = movie.title ?? movie.original_title ?? "Unknown Movie";
  const releaseDate = movie.release_date ? format(new Date(movie.release_date ?? ""), "PP") : "Unknown";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "Not Rated";

  return (
    <List.Item
      icon={`https://image.tmdb.org/t/p/w200/${movie.poster_path}`}
      title={title}
      detail={
        <List.Item.Detail
          markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${movie.backdrop_path})\n\n${
            movie.overview ?? ""
          }`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={title} />
              <List.Item.Detail.Metadata.Label title="Media Type" text="Movie" />
              <List.Item.Detail.Metadata.Label title="Release Date" text={releaseDate} />
              <List.Item.Detail.Metadata.Label
                title="Rating"
                text={`${rating}${movie.vote_count ? ` (${movie.vote_count} votes)` : ""}`}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Label title="TMDB ID" text={movie.id ? movie.id.toString() : "Unknown"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<MovieDetail movie={movie} />} />
          <Action.OpenInBrowser title="Open in TMDB" url={`https://www.themoviedb.org/movie/${movie.id ?? 0}`} />
          {movie.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={movie.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action.Push
            title="Show Posters"
            icon={Icon.Image}
            target={movie.id !== undefined && <Posters id={movie.id} type="movie" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={movie.id !== undefined && <Backdrops id={movie.id} type="movie" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}

function Show({ show }: { show: ShowResponse }) {
  const title = show.name ?? show.original_name ?? "Unknown Show";
  const firstAirDate = show.first_air_date ? format(new Date(show.first_air_date ?? ""), "PP") : "Unknown";
  const lastAirDate = show.last_air_date ? format(new Date(show.last_air_date ?? ""), "PP") : "";

  const rating = show.vote_average ? show.vote_average.toFixed(1) : "Not Rated";

  return (
    <List.Item
      icon={`https://image.tmdb.org/t/p/w200/${show.poster_path}`}
      title={show.name ?? "Unknown Show"}
      detail={
        <List.Item.Detail
          markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${show.backdrop_path})${
            show.overview ? `\n\n${show.overview}` : ""
          }`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={title} />
              <List.Item.Detail.Metadata.Label title="Media Type" text="TV Show" />
              <List.Item.Detail.Metadata.Label title="First Air Date" text={firstAirDate} />
              {lastAirDate ? <List.Item.Detail.Metadata.Label title="Last Air Date" text={lastAirDate} /> : null}

              <List.Item.Detail.Metadata.Label
                title="Rating"
                text={`${rating}${show.vote_count ? ` (${show.vote_count} votes)` : ""}`}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Label title="TMDB ID" text={show.id ? show.id.toString() : "Unknown"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<TvShowDetail show={show} />} />
          <Action.OpenInBrowser url={`https://www.themoviedb.org/tv/${show.id ?? 0}`} />
          {show.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={show.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action.Push
            title="Show Posters"
            icon={Icon.Image}
            target={show.id !== undefined && <Posters id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={show.id !== undefined && <Backdrops id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
