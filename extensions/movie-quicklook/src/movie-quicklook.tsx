import React from "react";
import { Action, ActionPanel, Detail, Grid, useNavigation, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Preferences {
  api_key: string;
}

interface Movie {
  id: number;
  genres: Genre[];
  overview: string;
  poster_path: string;
  release_date: string;
  runtime: number;
  title: string;
  vote_average: number;
  vote_count: number;
}

interface Genre {
  name: string;
}

interface Movies {
  results: Movie[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const { isLoading, data } = useFetch(
    () =>
      `https://api.themoviedb.org/3/search/movie?` + new URLSearchParams({ query: searchText, page: "1" }).toString(),
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${preferences.api_key}`,
      },
      mapResult(result: Movies) {
        return {
          data: result.results,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Zero}
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a movie"
      throttle
    >
      {searchText === "" && data.length === 0 ? (
        <Grid.EmptyView
          icon={"../assets/empty-view-icon.png"}
          title="Type a movie to get started"
          description="All images and data are from TMDB (themoviedb.com)"
        />
      ) : (
        data.map((movie: Movie) => (
          <Grid.Item
            key={movie.id}
            title={`${movie.title} (${movie.release_date.substring(0, 4)})`}
            subtitle={`${movie.vote_average > 0 ? movie.vote_average.toFixed(2) : "N/A"}`}
            content={
              movie.poster_path
                ? `https://image.tmdb.org/t/p/original/${movie.poster_path}`
                : "../assets/no-poster-search.png"
            }
            actions={
              <ActionPanel>
                <Action
                  title="Movie Quicklook"
                  onAction={() => push(<MovieDetails movieId={movie.id} api_key={preferences.api_key} />)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

function MovieDetails({ movieId, api_key }: { movieId: number; api_key: string }) {
  const { pop } = useNavigation();

  const { isLoading, data } = useFetch(() => `https://api.themoviedb.org/3/movie/${movieId}`, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    mapResult(result: Movie) {
      return {
        data: [result],
      };
    },
    keepPreviousData: true,
    initialData: [],
  });

  return (data || []).map((detail) => (
    <React.Fragment key={movieId}>
      <Detail
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Search" onAction={pop} />
          </ActionPanel>
        }
        markdown={`![Image](${detail.poster_path ? `https://image.tmdb.org/t/p/w185/${detail.poster_path}` : `../assets/no-poster-detail.png`})&NewLine;${detail.overview}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={`${detail.title}`} />
            <Detail.Metadata.Label
              title="Rating"
              text={`⭐ ${detail.vote_average > 0 ? detail.vote_average.toFixed(2) : "N/A"} (${detail.vote_count})`}
            />
            <Detail.Metadata.Label title="Release Year" text={`${detail.release_date.substring(0, 4)}`} />
            <Detail.Metadata.Label title="Runtime" text={`${detail.runtime} min`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Genres">
              {(detail.genres || []).map((genre) => (
                <Detail.Metadata.TagList.Item key={`${genre.name}`} text={`${genre.name}`} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <MovieReviews movieId={movieId} api_key={api_key} />
          </Detail.Metadata>
        }
      />
    </React.Fragment>
  ));
}

interface Reviews {
  results: Review[];
}

interface Review {
  author: string;
  author_details: { rating: number };
  content: string;
}

function MovieReviews({ movieId, api_key }: { movieId: number; api_key: string }) {
  const { data } = useFetch(() => `https://api.themoviedb.org/3/movie/${movieId}/reviews`, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    mapResult(result: Reviews) {
      return {
        data: result.results,
      };
    },
    keepPreviousData: true,
    initialData: [],
  });

  return (data || []).map((review) => (
    <React.Fragment key={review.author}>
      <Detail.Metadata.Label
        title="Rating"
        text={`${review.author} (⭐ ${review.author_details.rating !== null ? review.author_details.rating : "N/A"})`}
      />
      <Detail.Metadata.Label title="Review" text={`${review.content}`} />
      <Detail.Metadata.Separator />
    </React.Fragment>
  ));
}
