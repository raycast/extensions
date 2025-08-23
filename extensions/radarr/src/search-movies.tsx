import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, LaunchProps, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { searchMovies, useMovies } from "./hooks/useRadarrAPI";
import { formatMovieTitle, getMoviePoster, getRatingDisplay, getGenresDisplay, truncateText } from "./utils";
import type { MovieLookup } from "./types";
import AddMovieForm from "./add-movie-form";

interface Arguments {
  query?: string;
}

export default function SearchMovies(props: LaunchProps<{ arguments: Arguments }>) {
  // Ensure searchText is always a string from the start
  const initialQuery = props.arguments.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<MovieLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingMovies, setExistingMovies] = useState<Set<number>>(new Set());
  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: existingMoviesList } = useMovies(selectedInstance);

  // Update existing movies set when movies or instance changes
  useEffect(() => {
    if (existingMoviesList) {
      const tmdbIds = new Set((existingMoviesList || []).map(movie => movie.tmdbId));

      setExistingMovies(tmdbIds);
    }
  }, [existingMoviesList, selectedInstance]);

  // Force initial search if query is provided
  useEffect(() => {
    if (props.arguments.query && props.arguments.query.trim() && selectedInstance?.url && selectedInstance?.apiKey) {
      setIsSearching(true);
      searchMovies(selectedInstance, props.arguments.query)
        .then(results => setSearchResults(results))
        .catch(error => {
          console.error("Initial search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }
  }, [props.arguments.query, selectedInstance?.url, selectedInstance?.apiKey]); // Only run when instance is ready

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchText.trim() || !selectedInstance?.url || !selectedInstance?.apiKey) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      searchMovies(selectedInstance, searchText)
        .then(results => setSearchResults(results))
        .catch(error => {
          console.error("Search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedInstance]);

  const movieListItem = (movie: MovieLookup) => {
    const poster = getMoviePoster(movie);
    const rating = getRatingDisplay(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";

    // Check if movie is already in library using our manual verification
    const isAlreadyAdded = existingMovies.has(movie.tmdbId);

    const accessories = [...(isAlreadyAdded ? [{ icon: Icon.Check, tooltip: "Already in library" }] : [])];

    return (
      <List.Item
        key={movie.tmdbId}
        icon={poster || Icon.Video}
        title={formatMovieTitle(movie)}
        accessories={accessories}
        detail={
          <List.Item.Detail
            markdown={`# ${formatMovieTitle(movie)}

${poster ? `<img src="${poster}" alt="Poster" width="200" />` : ""}

## Overview
${overview}

## Details
- **Runtime:** ${movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
- **Status:** ${movie.status}
- **Genres:** ${genres || "Not specified"}
- **Studio:** ${movie.studio || "Not specified"}
${rating ? `- **Ratings:** ${rating}` : ""}
${movie.imdbId ? `- **IMDb:** [${movie.imdbId}](https://imdb.com/title/${movie.imdbId})` : ""}
${movie.website ? `- **Website:** [${movie.website}](${movie.website})` : ""}

## Release Information
${movie.inCinemas ? `- **In Cinemas:** ${new Date(movie.inCinemas).toDateString()}` : ""}
${movie.certification ? `- **Certification:** ${movie.certification}` : ""}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {isAlreadyAdded ? (
                <Action.OpenInBrowser
                  title="Open in Radarr"
                  url={`${selectedInstance?.url}/movie/${movie.tmdbId}`}
                  icon={Icon.Globe}
                />
              ) : selectedInstance ? (
                <Action.Push
                  title="Configure & Add"
                  icon={Icon.Plus}
                  target={<AddMovieForm movie={movie} instance={selectedInstance} />}
                />
              ) : null}
              {movie.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${movie.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {movie.tmdbId && (
                <Action.OpenInBrowser
                  title="Open in Tmdb"
                  url={`https://themoviedb.org/movie/${movie.tmdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {movie.title && (
                <Action.OpenInBrowser
                  title="Search in Tvdb"
                  url={`https://www.thetvdb.com/search?query=${encodeURIComponent(movie.title)}`}
                  icon={Icon.Globe}
                />
              )}
            </ActionPanel.Section>
            {instances.length > 1 && (
              <ActionPanel.Section title="Instance">
                {instances.map(instance => (
                  <Action
                    key={instance.name}
                    title={`Switch to ${instance.name}`}
                    icon={selectedInstance?.name === instance.name ? Icon.Check : Icon.Circle}
                    onAction={() => switchToInstance(instance)}
                  />
                ))}
                <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  if (instanceLoading) {
    return <List isLoading={true} />;
  }

  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Radarr Instances Configured"
          description="Please configure your Radarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      key={`search-${selectedInstance?.name || "default"}`}
      isLoading={isSearching}
      onSearchTextChange={text => setSearchText(text || "")}
      searchText={searchText}
      searchBarPlaceholder={`Search movies on ${selectedInstance?.name || "Radarr"}...`}
      throttle
      isShowingDetail
    >
      <List.EmptyView
        title={searchText.trim() ? "No Results Found" : "Start Typing to Search"}
        description={
          searchText.trim() ? `No movies found for "${searchText}"` : "Enter a movie title to begin searching"
        }
        icon={searchText.trim() ? Icon.MagnifyingGlass : Icon.Video}
      />
      {(searchResults || []).map(movieListItem)}contributions/merge-1755946618974
    </List>
  );
}
