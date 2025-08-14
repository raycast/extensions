import React, { useState } from "react";
import { Grid, ActionPanel, Action, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useCalendar } from "./hooks/useRadarrAPI";
import { getMoviePoster, formatReleaseDate } from "./utils";
import type { CalendarMovie } from "./types";

type MonitoringFilter = "all" | "monitored" | "unmonitored";

export default function UpcomingReleases() {
  const [monitoringFilter, setMonitoringFilter] = useState<MonitoringFilter>("all");

  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const today = new Date();
  const twoMonthsFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const {
    data: calendarMovies,
    isLoading,
    error,
  } = useCalendar(selectedInstance, today.toISOString().split("T")[0], twoMonthsFromNow.toISOString().split("T")[0]);

  const movieGridItem = (movie: CalendarMovie) => {
    const poster = getMoviePoster(movie);

    // Get next future release date
    const today = new Date();
    let nextReleaseDate = null;

    // Check digital release first
    if (movie.digitalRelease && new Date(movie.digitalRelease) > today) {
      nextReleaseDate = movie.digitalRelease;
    }
    // Then check cinema release
    else if (movie.inCinemas && new Date(movie.inCinemas) > today) {
      nextReleaseDate = movie.inCinemas;
    }
    // Finally check physical release
    else if (movie.physicalRelease && new Date(movie.physicalRelease) > today) {
      nextReleaseDate = movie.physicalRelease;
    }
    // If no future dates, use the latest available date
    else {
      nextReleaseDate = movie.digitalRelease || movie.inCinemas || movie.physicalRelease;
    }

    const formattedDate = nextReleaseDate ? formatReleaseDate(nextReleaseDate) : "TBA";

    // Create subtitle with year and release date
    const subtitle = `${movie.year} • ${formattedDate}`;

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
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => window.location.reload()} />
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
          title="Failed to Load Calendar"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => window.location.reload()} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  // Filter by monitoring status, exclude movies with files, and sort by release date (closest first)
  const filteredAndSortedMovies = calendarMovies
    ? calendarMovies
        .filter(movie => {
          // Exclude movies that already have files available
          if (movie.hasFile) return false;

          // Filter by monitoring status
          if (monitoringFilter === "all") return true;
          return (
            (monitoringFilter === "monitored" && movie.monitored) ||
            (monitoringFilter === "unmonitored" && !movie.monitored)
          );
        })
        .sort((a, b) => {
          const today = new Date();

          // Get next future release date for movie A
          let dateA = "";
          if (a.digitalRelease && new Date(a.digitalRelease) > today) {
            dateA = a.digitalRelease;
          } else if (a.inCinemas && new Date(a.inCinemas) > today) {
            dateA = a.inCinemas;
          } else if (a.physicalRelease && new Date(a.physicalRelease) > today) {
            dateA = a.physicalRelease;
          } else {
            dateA = a.digitalRelease || a.inCinemas || a.physicalRelease || "";
          }

          // Get next future release date for movie B
          let dateB = "";
          if (b.digitalRelease && new Date(b.digitalRelease) > today) {
            dateB = b.digitalRelease;
          } else if (b.inCinemas && new Date(b.inCinemas) > today) {
            dateB = b.inCinemas;
          } else if (b.physicalRelease && new Date(b.physicalRelease) > today) {
            dateB = b.physicalRelease;
          } else {
            dateB = b.digitalRelease || b.inCinemas || b.physicalRelease || "";
          }

          // Sort by closest release date first
          if (!dateA && !dateB) return a.sortTitle.localeCompare(b.sortTitle);
          if (!dateA) return 1;
          if (!dateB) return -1;

          return new Date(dateA).getTime() - new Date(dateB).getTime();
        })
    : [];

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search upcoming releases on ${selectedInstance?.name || "Radarr"}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Monitoring Status"
          value={monitoringFilter}
          onChange={value => setMonitoringFilter(value as MonitoringFilter)}
        >
          <Grid.Dropdown.Item title="All Movies" value="all" />
          <Grid.Dropdown.Item title="📡 Monitored" value="monitored" />
          <Grid.Dropdown.Item title="⚫ Unmonitored" value="unmonitored" />
        </Grid.Dropdown>
      }
    >
      {filteredAndSortedMovies.length === 0 ? (
        <Grid.EmptyView
          title={
            monitoringFilter === "all"
              ? "No Upcoming Releases"
              : `No ${monitoringFilter.charAt(0).toUpperCase() + monitoringFilter.slice(1)} Releases`
          }
          description={
            monitoringFilter === "all"
              ? "No movies found in the next 2 months"
              : `No ${monitoringFilter} movies found in the next 2 months`
          }
          icon={Icon.Calendar}
        />
      ) : (
        filteredAndSortedMovies.map(movieGridItem)
      )}
    </Grid>
  );
}
