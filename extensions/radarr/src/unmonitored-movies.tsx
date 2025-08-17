import React, { useState } from "react";
import { Grid, ActionPanel, Action, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useMovies } from "./hooks/useRadarrAPI";
import { getMoviePoster } from "./utils";
import type { Movie } from "./types";

type AvailabilityFilter = "all" | "available" | "missing";

export default function UnmonitoredMovies() {
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");

  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: movies, isLoading, error, mutate } = useMovies(selectedInstance);

  const movieGridItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);

    // Get availability status for unmonitored movies
    const isAvailable = movie.hasFile;
    const availabilityIcon = isAvailable ? "🟢" : "🟡";
    const availabilityText = isAvailable ? "Available" : "Missing";

    // Create subtitle with year, availability and status
    const subtitle = `${movie.year} • ${availabilityIcon} ${availabilityText}`;

    return (
      <Grid.Item
        key={movie.id}
        content={{
          source: poster || Icon.Video,
          fallback: Icon.Video,
        }}
        title={movie.title}
        subtitle={subtitle}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Radarr"
                url={`${selectedInstance?.url}/movie/${movie.tmdbId}`}
                icon={Icon.Globe}
              />
              {movie.movieFile && (
                <Action.CopyToClipboard title="Copy File Path" content={movie.movieFile.path} icon={Icon.Clipboard} />
              )}
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
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={mutate} />
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
    return <Grid isLoading={true} />;
  }

  if (instances.length === 0) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No Radarr Instances Configured"
          description="Please configure your Radarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          title="Failed to Load Movies"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  // Filter only unmonitored movies, then by availability, and sort them
  const unmonitoredMovies = movies?.filter(movie => !movie.monitored) || [];
  const filteredAndSortedMovies = unmonitoredMovies
    .filter(movie => {
      if (availabilityFilter === "all") return true;
      const isAvailable = movie.hasFile;
      return (availabilityFilter === "available" && isAvailable) || (availabilityFilter === "missing" && !isAvailable);
    })
    .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search unmonitored movies on ${selectedInstance?.name || "Radarr"}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Availability"
          value={availabilityFilter}
          onChange={value => setAvailabilityFilter(value as AvailabilityFilter)}
        >
          <Grid.Dropdown.Item title="All Movies" value="all" />
          <Grid.Dropdown.Item title="🟢 Available" value="available" />
          <Grid.Dropdown.Item title="🟡 Missing" value="missing" />
        </Grid.Dropdown>
      }
    >
      {filteredAndSortedMovies.length === 0 ? (
        <Grid.EmptyView
          title={
            availabilityFilter === "all"
              ? "No Unmonitored Movies"
              : `No ${availabilityFilter.charAt(0).toUpperCase() + availabilityFilter.slice(1)} Unmonitored Movies`
          }
          description={
            availabilityFilter === "all"
              ? "All movies in your library are currently being monitored"
              : `No unmonitored movies match the ${availabilityFilter} filter`
          }
          icon={Icon.EyeDisabled}
        />
      ) : (
        filteredAndSortedMovies.map(movieGridItem)
      )}
    </Grid>
  );
}
