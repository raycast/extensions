import { useState } from "react";
import type { LaunchProps } from "@raycast/api";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { fetchMoviesByTitle } from "./letterboxd-api";
import type { Movie } from "./types";
import MovieDetails from "./movie-details";
import { STRINGS } from "./strings";

interface SearchArguments {
  title?: string;
}

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT_SEARCHES = 8;

export default function SearchMoviesPage(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const initialQuery =
    props.arguments.title?.trim() || props.fallbackText?.trim() || "";
  const [searchQuery, setSearch] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useCachedState<string[]>(
    RECENT_SEARCHES_KEY,
    [],
  );
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    fetchMoviesByTitle,
    [searchQuery],
    {
      execute: searchQuery.trim().length > 0,
      keepPreviousData: true,
    },
  );

  const trimmedQuery = searchQuery.trim();
  const recordRecentSearch = () => {
    if (!trimmedQuery) return;
    setRecentSearches((current) =>
      [
        trimmedQuery,
        ...current.filter(
          (query) => query.toLowerCase() !== trimmedQuery.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT_SEARCHES),
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      throttle
      searchBarPlaceholder={STRINGS.searchMoviesPlaceholder}
      onSearchTextChange={setSearch}
      pagination={trimmedQuery ? pagination : undefined}
    >
      {!trimmedQuery ? (
        recentSearches.length ? (
          <List.Section title={STRINGS.recentSearches}>
            {recentSearches.map((query) => (
              <List.Item
                key={query}
                icon={Icon.Clock}
                title={query}
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.MagnifyingGlass}
                      title="Search Again"
                      onAction={() => setSearch(query)}
                    />
                    <Action
                      icon={Icon.Trash}
                      title={STRINGS.clearRecentSearches}
                      style={Action.Style.Destructive}
                      onAction={() => setRecentSearches([])}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.FilmStrip}
            title={STRINGS.startSearching}
            description={STRINGS.startSearchingDescription}
          />
        )
      ) : error && !isLoading ? (
        <List.EmptyView
          title={STRINGS.somethingWentWrong}
          description={STRINGS.tryAgain}
          actions={
            <ActionPanel>
              <Action title={STRINGS.retry} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !isLoading && !data?.length ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={STRINGS.noMoviesFound}
          description={STRINGS.noMoviesFoundDescription}
        />
      ) : (
        data?.map((movie) => (
          <MovieItem key={movie.id} movie={movie} onOpen={recordRecentSearch} />
        ))
      )}
    </List>
  );
}

interface MovieItemProps {
  movie: Movie;
  onOpen: () => void;
}

function getAccessories(movie: Movie): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (movie.top250Position) {
    accessories.push({
      icon: Icon.Trophy,
      text: `#${movie.top250Position}`,
      tooltip: "Letterboxd Top 250",
    });
  }
  if (movie.rating !== undefined) {
    accessories.push({
      text: `★ ${movie.rating.toFixed(2)}`,
      tooltip: "Letterboxd Rating",
    });
  }
  if (movie.runtime) accessories.push({ text: `${movie.runtime}m` });
  if (movie.director) accessories.push({ text: movie.director });
  return accessories;
}

function getMarkdownLink(movie: Movie): string {
  const year = movie.released ? ` (${movie.released})` : "";
  return `[${movie.title}${year}](${movie.links.letterboxd})`;
}

function MovieItem({ movie, onOpen }: MovieItemProps) {
  return (
    <List.Item
      title={movie.title}
      subtitle={movie.released}
      id={movie.id}
      keywords={movie.genres}
      accessories={getAccessories(movie)}
      icon={movie.thumbnail ? { source: movie.thumbnail } : Icon.FilmStrip}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Window}
            title={STRINGS.showDetails}
            target={<MovieDetails movie={movie} />}
            onPush={onOpen}
          />
          <Action.OpenInBrowser
            title="Open in Letterboxd"
            url={movie.links.letterboxd}
            onOpen={onOpen}
          />
          {movie.links.imdb ? (
            <Action.OpenInBrowser title="Open in IMDb" url={movie.links.imdb} />
          ) : null}
          {movie.links.tmdb ? (
            <Action.OpenInBrowser title="Open in TMDB" url={movie.links.tmdb} />
          ) : null}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.Copy}
              title={STRINGS.copyTitle}
              content={movie.title}
            />
            <Action.CopyToClipboard
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "," },
                Windows: { modifiers: ["ctrl", "shift"], key: "," },
              }}
              title={STRINGS.copyUrl}
              content={movie.links.letterboxd}
            />
            <Action.CopyToClipboard
              title={STRINGS.copyMarkdownLink}
              content={getMarkdownLink(movie)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
