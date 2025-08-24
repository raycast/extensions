import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "./api";
import { useState } from "react";
import { getRating } from "./helpers";

export default function Command() {
  const [type, setType] = useState("movie");
  const [page, setPage] = useState(1);

  const { data: results, isLoading: isLoading } = useCachedPromise(
    async (type, page) => {
      if (type === "movie") {
        const results = await moviedb.movieTopRated({ page });
        return results.results;
      }

      if (type === "show") {
        const results = await moviedb.tvTopRated({ page });
        return results.results;
      }
    },
    [type, page],
  );

  const placeholder = type === "show" ? "Filter TV shows by title" : "Filter movies by title";

  return (
    <Grid
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={5}
      navigationTitle={`Top Rated — Page ${page}`}
      searchBarPlaceholder={placeholder}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Media Type" onChange={setType} storeValue>
          <Grid.Dropdown.Item title="Movies" value="movie" />
          <Grid.Dropdown.Item title="TV Shows" value="show" />
        </Grid.Dropdown>
      }
    >
      {results?.map((result) => {
        let title;
        if ("first_air_date" in result) {
          title = result.name ?? result.original_name ?? "Unknown TV show";
        }

        if ("title" in result) {
          title = result.title ?? result.original_title ?? "Unknown movie";
        }

        return (
          <Grid.Item
            key={result.poster_path}
            content={`https://image.tmdb.org/t/p/w500/${result.poster_path}`}
            title={title}
            subtitle={getRating(result.vote_average)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://www.themoviedb.org/${type === "show" ? "tv" : "movie"}/${result.id ?? 0}`}
                />
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
