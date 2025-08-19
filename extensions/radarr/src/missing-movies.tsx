import React, { useState } from "react";
import { Grid, ActionPanel, Action, Icon, Color } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useMissingMovies } from "./hooks/useRadarrAPI";
import { getMoviePoster } from "./utils";
import type { Movie } from "./types";

type StatusFilter = "all" | "missing" | "upcoming" | "not-released";

export default function MissingMovies() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: missingMoviesResponse, isLoading, error, mutate } = useMissingMovies(selectedInstance);
  const missingMovies = missingMoviesResponse?.records;

  const getAvailabilityColor = (movie: Movie): Color => {
    if (!movie.inCinemas && !movie.digitalRelease && !movie.physicalRelease) {
      return Color.SecondaryText; // Not released yet
    }

    const now = new Date();
    const releaseDate = new Date(movie.inCinemas || movie.digitalRelease || movie.physicalRelease || "");

    if (releaseDate > now) {
      return Color.Yellow; // Future release
    }

    return Color.Red; // Missing (released but not downloaded)
  };

  const getAvailabilityStatus = (movie: Movie): string => {
    if (!movie.inCinemas && !movie.digitalRelease && !movie.physicalRelease) {
      return "Not Released";
    }

    const now = new Date();
    const releaseDate = new Date(movie.inCinemas || movie.digitalRelease || movie.physicalRelease || "");

    if (releaseDate > now) {
      return "Upcoming";
    }

    // If it's released and monitored but not downloaded, it's missing
    return "Missing";
  };

  const movieGridItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);
    const availabilityStatus = getAvailabilityStatus(movie);
    const availabilityColor = getAvailabilityColor(movie);

    // Create subtitle with year and availability with colored indicator
    const availabilityIcon =
      availabilityColor === Color.Red
        ? "🔴"
        : availabilityColor === Color.Yellow
          ? "🟡"
          : availabilityColor === Color.SecondaryText
            ? "⚪"
            : "🟢";

    const subtitle = `${movie.year} • ${availabilityIcon} ${availabilityStatus}`;

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
              <Action.OpenInBrowser
                title="Search for Movie"
                url={`${selectedInstance?.url}/movie/${movie.tmdbId}#search`}
                icon={Icon.MagnifyingGlass}
              />
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
          title="Failed to Load Missing Movies"
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

  const filteredAndSortedMovies = missingMovies
    ? [...missingMovies]
        .filter(movie => {
          if (statusFilter === "all") return true;
          const status = getAvailabilityStatus(movie);
          return (
            (statusFilter === "missing" && status === "Missing") ||
            (statusFilter === "upcoming" && status === "Upcoming") ||
            (statusFilter === "not-released" && status === "Not Released")
          );
        })
        .sort((a, b) => {
          // Sort by release date, with most recent releases first
          const dateA = a.inCinemas || a.digitalRelease || a.physicalRelease || "";
          const dateB = b.inCinemas || b.digitalRelease || b.physicalRelease || "";

          if (!dateA && !dateB) return a.sortTitle.localeCompare(b.sortTitle);
          if (!dateA) return 1;
          if (!dateB) return -1;

          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
    : [];

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search missing movies on ${selectedInstance?.name || "Radarr"}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={value => setStatusFilter(value as StatusFilter)}
        >
          <Grid.Dropdown.Item title="All Movies" value="all" />
          <Grid.Dropdown.Item title="🔴 Missing" value="missing" />
          <Grid.Dropdown.Item title="🟡 Upcoming" value="upcoming" />
          <Grid.Dropdown.Item title="⚪ Not Released" value="not-released" />
        </Grid.Dropdown>
      }
    >
      {filteredAndSortedMovies.length === 0 ? (
        <Grid.EmptyView
          title={
            statusFilter === "all"
              ? "No Missing Movies"
              : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Movies`
          }
          description={
            statusFilter === "all"
              ? "All monitored movies have been downloaded"
              : `No movies match the ${statusFilter} filter`
          }
          icon={Icon.Check}
        />
      ) : (
        filteredAndSortedMovies.map(movieGridItem)
      )}
    </Grid>
  );
}
