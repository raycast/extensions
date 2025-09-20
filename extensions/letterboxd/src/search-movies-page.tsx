import React, { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchMoviesByTitle, getFullURL } from "./letterboxd-api";
import type { Movie } from "./types";
import MovieDetails from "./movie-details";
import { STRINGS } from "./strings";

interface SearchMoviesPageProps {
  arguments: {
    title: string;
  };
}

export default function SearchMoviesPage(props: SearchMoviesPageProps) {
  const [searchQuery, setSearch] = useState(props.arguments.title);
  const { data, isLoading } = useCachedPromise(
    fetchMoviesByTitle,
    [searchQuery],
    { execute: searchQuery.length > 0 },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      throttle
      searchBarPlaceholder={STRINGS.searchMoviesPlaceholder}
      onSearchTextChange={setSearch}
    >
      {data?.data?.map((movie) => <MovieItem key={movie.id} movie={movie} />)}
    </List>
  );
}

interface MovieItemProps {
  movie: Movie;
}

function MovieItem(props: MovieItemProps) {
  const { movie } = props;
  const { released, director, title, thumbnail, detailsPage } = movie;

  return (
    <List.Item
      title={title}
      subtitle={released}
      id={movie.id}
      accessories={director ? [{ text: director }] : undefined}
      icon={thumbnail ? { source: thumbnail } : Icon.FilmStrip}
      actions={
        <ActionPanel>
          <>
            <Action.Push
              icon={Icon.Window}
              title={STRINGS.showDetails}
              target={
                <MovieDetails movieTitle={title} qualifier={detailsPage} />
              }
            />
            <Action.OpenInBrowser url={getFullURL(detailsPage)} />
          </>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title={STRINGS.copyTitle}
              content={title}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title={STRINGS.copyUrl}
              content={getFullURL(detailsPage)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
