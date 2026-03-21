import { ActionPanel, List, Icon, getPreferenceValues, Grid, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

import {
  ActionCopyPoster,
  ActionDownloadPoster,
  ActionOpenImdbPage,
  ActionOpenSeriesGraphPage,
  ActionOpenTmdbPage,
  ActionShowDetails,
  ActionToggleLayout,
} from "./components/Actions";
import { SearchResult } from "./types";

const API_BASE_URL = "https://api.imdbapi.dev";

export default function Command() {
  const preferences = getPreferenceValues();
  const viewMode = preferences.viewMode;
  const preferredWebsite = preferences.preferredWebsite;

  const [layout, setLayout] = useState<string>(viewMode);
  const [columns, setColumns] = useState(5);

  const [searchText, setSearchText] = useState("");

  const res = useFetch<{ titles: SearchResult[] }>(
    `${API_BASE_URL}/search/titles?query=${searchText ? searchText : `""`}`,
    {
      keepPreviousData: true,
      execute: searchText.length > 0,
    },
  );
  const filteredShows = res.data?.titles?.filter((item) => item.type === "tvSeries") || [];

  const shiftEnterShortcut: Keyboard.Shortcut = {
    macOS: { modifiers: ["shift"], key: "return" },
    Windows: { modifiers: ["shift"], key: "enter" },
  };

  const altEnterShortcut: Keyboard.Shortcut = {
    macOS: { modifiers: ["opt"], key: "return" },
    Windows: { modifiers: ["alt"], key: "enter" },
  };

  if (layout === "grid") {
    return (
      <Grid
        isLoading={res.isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        fit={Grid.Fit.Fill}
        aspectRatio="2/3"
        columns={columns}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Grid Item Size"
            storeValue
            onChange={(newValue) => {
              setColumns(parseInt(newValue));
            }}
          >
            <Grid.Dropdown.Item title="Large" value="3" />
            <Grid.Dropdown.Item title="Medium" value="5" />
            <Grid.Dropdown.Item title="Small" value="8" />
          </Grid.Dropdown>
        }
        throttle
      >
        {res.isLoading && searchText ? (
          <Grid.EmptyView title="Loading…" icon={Icon.Hourglass} description="Fetching results…" />
        ) : searchText ? (
          <Grid.Section>
            {filteredShows.map((show) => (
              <Grid.Item
                key={show.id}
                content={{
                  source: show?.primaryImage?.url ?? "",
                  fallback: Icon.FilmStrip,
                }}
                title={show.primaryTitle}
                subtitle={`(${show?.startYear ?? "unknown"}–${show?.endYear ?? "now"})`}
                accessory={{
                  icon: Icon.FilmStrip,
                  tooltip: String(show?.rating?.aggregateRating || "N/A"),
                }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <ActionShowDetails show={show} />
                    </ActionPanel.Section>
                    {preferredWebsite === "imdb" ? (
                      <ActionPanel.Section>
                        <ActionOpenImdbPage imdbId={show?.id} shortcut={undefined} />
                        <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <ActionOpenTmdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    ) : preferredWebsite === "tmdb" ? (
                      <ActionPanel.Section>
                        <ActionOpenTmdbPage imdbId={show?.id} shortcut={undefined} />
                        <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <ActionOpenImdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={undefined} />
                        <ActionOpenImdbPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <ActionOpenTmdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      <ActionCopyPoster posterUrl={show?.primaryImage?.url} />
                      <ActionDownloadPoster posterUrl={show?.primaryImage?.url} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <ActionToggleLayout layout={layout} setLayout={setLayout} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ) : (
          <Grid.EmptyView title="Start Searching" description="Search for TV shows" />
        )}
      </Grid>
    );
  }

  return (
    <List isLoading={res.isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {res.isLoading && searchText ? (
        <List.EmptyView title="Loading…" icon={Icon.Hourglass} description="Fetching results…" />
      ) : searchText ? (
        <List.Section>
          {filteredShows.map((show) => (
            <List.Item
              key={show.id}
              icon={{
                source: show?.primaryImage?.url ?? "",
                fallback: Icon.FilmStrip,
              }}
              title={show.primaryTitle}
              subtitle={`(${show?.startYear ?? "unknown"}–${show?.endYear ?? "now"})`}
              accessories={[
                ...(show?.primaryTitle !== show?.originalTitle ? [{ text: show?.originalTitle }] : []),
                { text: String(show?.rating?.aggregateRating || "N/A"), icon: Icon.Star },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <ActionShowDetails show={show} />
                  </ActionPanel.Section>
                  {preferredWebsite === "imdb" ? (
                    <ActionPanel.Section>
                      <ActionOpenImdbPage imdbId={show?.id} shortcut={undefined} />
                      <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <ActionOpenTmdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  ) : preferredWebsite === "tmdb" ? (
                    <ActionPanel.Section>
                      <ActionOpenTmdbPage imdbId={show?.id} shortcut={undefined} />
                      <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <ActionOpenImdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  ) : (
                    <ActionPanel.Section>
                      <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={undefined} />
                      <ActionOpenImdbPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <ActionOpenTmdbPage imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <ActionCopyPoster posterUrl={show?.primaryImage?.url} />
                    <ActionDownloadPoster posterUrl={show?.primaryImage?.url} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ActionToggleLayout layout={layout} setLayout={setLayout} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="Start Searching" description="Search for TV shows" />
      )}
    </List>
  );
}
