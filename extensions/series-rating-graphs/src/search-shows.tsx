import { ActionPanel, List, Icon, getPreferenceValues, Grid, Keyboard, Color } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";

import {
  CopyPosterAction,
  DownloadPosterAction,
  OpenImdbPageAction,
  OpenSeriesGraphPageAction,
  OpenTmdbPageAction,
  ShowDetailsAction,
  ToggleLayoutAction,
} from "./components/Actions";
import { SearchResult } from "./types";
import { getApiBaseUrl } from "./utils/api";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const preferredWebsite = preferences.preferredWebsite;
  const apiBaseUrl = getApiBaseUrl();

  const [searchText, setSearchText] = useState("");

  const defaultLayout = preferences.viewMode ?? "grid";
  const [layout, setLayout] = useCachedState("layout", defaultLayout);

  const toggleLayout = () => setLayout((current: string) => (current === "grid" ? "list" : "grid"));

  const res = useFetch<{ titles: SearchResult[] }>(
    `${apiBaseUrl}/search/titles?query=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      execute: searchText.length > 0,
    },
  );
  const filteredShows = res.data?.titles?.filter((item) => item.type === "tvSeries") || [];
  const hasError = Boolean(res.error);

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
        searchBarPlaceholder="Search TV Shows…"
        fit={Grid.Fit.Fill}
        aspectRatio="2/3"
        throttle
      >
        {hasError && searchText ? (
          <Grid.EmptyView
            title="Failed to fetch data"
            icon={Icon.ExclamationMark}
            description={res.error?.message ?? "Could not reach the ratings API. Try again."}
          />
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
                  icon: { source: Icon.Star, tintColor: Color.Yellow },
                  tooltip: show?.rating?.aggregateRating?.toFixed(1) ?? "N/A",
                }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <ShowDetailsAction show={show} />
                    </ActionPanel.Section>
                    {preferredWebsite === "imdb" ? (
                      <ActionPanel.Section>
                        <OpenImdbPageAction imdbId={show?.id} shortcut={undefined} />
                        <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <OpenTmdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    ) : preferredWebsite === "tmdb" ? (
                      <ActionPanel.Section>
                        <OpenTmdbPageAction imdbId={show?.id} shortcut={undefined} />
                        <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <OpenImdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={undefined} />
                        <OpenImdbPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                        <OpenTmdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      <CopyPosterAction posterUrl={show?.primaryImage?.url} />
                      <DownloadPosterAction posterUrl={show?.primaryImage?.url} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
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
    <List
      isLoading={res.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search TV Shows…"
      isShowingDetail
      throttle
    >
      {hasError && searchText ? (
        <List.EmptyView
          title="Failed to fetch data"
          icon={Icon.ExclamationMark}
          description={res.error?.message ?? "Could not reach the ratings API. Try again."}
        />
      ) : searchText ? (
        <List.Section>
          {filteredShows.map((show) => (
            <List.Item
              key={show.id}
              icon={{
                source: show?.primaryImage?.url ?? "",
                fallback: Icon.FilmStrip,
              }}
              title={{ value: show.primaryTitle, tooltip: show.primaryTitle }}
              detail={
                <List.Item.Detail
                  isLoading={res.isLoading}
                  markdown={`<img src="${show.primaryImage?.url}" width="200" />`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={show.primaryTitle} />
                      {show.primaryTitle === show.originalTitle || !show.originalTitle ? undefined : (
                        <List.Item.Detail.Metadata.Label title="Original Title" text={show.originalTitle} />
                      )}
                      <List.Item.Detail.Metadata.Label
                        icon={Icon.Calendar}
                        title="Release Date"
                        text={`${show.startYear ?? "N/A"}–${show.endYear ?? "now"}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        icon={Icon.Star}
                        title="Rating"
                        text={`${show.rating?.aggregateRating.toFixed(1) || "N/A"} (${show.rating?.voteCount.toLocaleString() || "N/A"} votes)`}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <ShowDetailsAction show={show} />
                  </ActionPanel.Section>
                  {preferredWebsite === "imdb" ? (
                    <ActionPanel.Section>
                      <OpenImdbPageAction imdbId={show?.id} shortcut={undefined} />
                      <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <OpenTmdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  ) : preferredWebsite === "tmdb" ? (
                    <ActionPanel.Section>
                      <OpenTmdbPageAction imdbId={show?.id} shortcut={undefined} />
                      <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <OpenImdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  ) : (
                    <ActionPanel.Section>
                      <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={undefined} />
                      <OpenImdbPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
                      <OpenTmdbPageAction imdbId={show?.id} shortcut={altEnterShortcut} />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <CopyPosterAction posterUrl={show?.primaryImage?.url} />
                    <DownloadPosterAction posterUrl={show?.primaryImage?.url} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
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
