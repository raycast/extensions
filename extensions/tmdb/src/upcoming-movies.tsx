import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "./api";
import { useState } from "react";
import { format } from "date-fns";
import { getRating } from "./helpers";

export default function Command() {
  const [page, setPage] = useState(1);

  const { data: movies, isLoading: isLoading } = useCachedPromise(
    async (page) => {
      const results = await moviedb.upcomingMovies({ page });
      return results.results;
    },
    [page],
  );

  return (
    <Grid
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder="Filter upcoming movies by title"
      navigationTitle={`Upcoming Movies — Page ${page}`}
    >
      {movies?.map((movie) => {
        const title = movie.title ?? movie.original_title ?? "Unknown movie";

        return (
          <Grid.Item
            key={movie.poster_path}
            content={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
            title={title}
            subtitle={getRating(movie.vote_average)}
            {...(movie.release_date
              ? { accessory: { icon: Icon.Calendar, tooltip: format(new Date(movie.release_date), "PP") } }
              : {})}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.themoviedb.org/movie/${movie.id ?? 0}`} />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.ArrowRight}
                    title="Next Page"
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => setPage((page) => page + 1)}
                  />
                  {page > 1 ? (
                    <Action
                      icon={Icon.ArrowLeft}
                      title="Previous Page"
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={() => setPage((page) => page - 1)}
                    />
                  ) : null}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
