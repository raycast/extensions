import { ActionPanel, Detail, Grid, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { search } from "knowyourmeme-js";
import {
  CopyUrlAction,
  OpenInBrowserAction,
  RefreshAction,
  ShowDetailsAction,
  ToggleLayoutAction,
} from "./components/Actions";
import { useCachedState, usePromise } from "@raycast/utils";

export default function Command() {
  const preferences = getPreferenceValues();
  const maxResults = preferences.maxResults;

  const [searchText, setSearchText] = useState("");

  const defaultLayout = preferences.viewType ?? "grid";
  const [layout, setLayout] = useCachedState("layout", defaultLayout);

  const toggleLayout = () => setLayout((current: string) => (current === "grid" ? "list" : "grid"));

  const {
    isLoading,
    data: memes,
    revalidate,
  } = usePromise(
    async (query: string, limit: number) => {
      if (!query.trim()) return [];

      const { results } = await search(query, limit);
      return results;
    },
    [searchText, Number(maxResults)],
  );

  return layout === "grid" ? (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for memes…"
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      columns={5}
      throttle
    >
      {searchText === "" && memes?.length === 0 ? (
        <Grid.EmptyView
          icon="no-view.png"
          title="Start Searching"
          description="Search for a meme to get info about it"
        />
      ) : isLoading ? (
        <Grid.EmptyView icon={Icon.Hourglass} title="Loading…" description="Fetching memes…" />
      ) : (
        memes?.map((meme) => (
          <Grid.Item
            key={meme.link}
            title={meme.title}
            content={{ source: meme.thumbnail.url }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <ShowDetailsAction meme={meme} />
                  <OpenInBrowserAction meme={meme} />
                  <CopyUrlAction meme={meme} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
                  <RefreshAction revalidate={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  ) : (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for memes…"
      throttle
      isShowingDetail
    >
      {searchText === "" && memes?.length === 0 ? (
        <List.EmptyView
          icon="no-view.png"
          title="Start Searching"
          description="Search for a meme to learn more about it"
        />
      ) : isLoading ? (
        <List.EmptyView icon={Icon.Hourglass} title="Loading…" description="Fetching memes…" />
      ) : (
        <List.Section title="Results" subtitle={memes?.length.toString()}>
          {memes?.map((meme) => (
            <List.Item
              key={meme.link}
              icon={{
                source: meme.thumbnail.url ?? Icon.Image,
                mask: Image.Mask.Circle,
              }}
              title={{ value: meme.title, tooltip: meme.title }}
              detail={
                <List.Item.Detail
                  isLoading={isLoading}
                  markdown={`# ${meme.title}\n\n![${meme.thumbnail.alt}](${meme.thumbnail.url})\n\n${meme.summary || "No summary available."}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        icon={Icon.Eye}
                        title="Views"
                        text={meme.views?.toLocaleString() || "No Data"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      {meme.year && (
                        <Detail.Metadata.Label
                          icon={Icon.Calendar}
                          title="Year"
                          text={meme.year.toString() || "No Data"}
                        />
                      )}
                      {meme.origin && (
                        <Detail.Metadata.Label icon={Icon.Compass} title="Origin" text={meme.origin || "No Data"} />
                      )}
                      {meme.region && (
                        <Detail.Metadata.Label icon={Icon.Pin} title="Region" text={meme.region || "No Data"} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <ShowDetailsAction meme={meme} />
                    <OpenInBrowserAction meme={meme} />
                    <CopyUrlAction meme={meme} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
                    <RefreshAction revalidate={revalidate} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
