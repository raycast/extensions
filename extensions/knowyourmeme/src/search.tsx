import { ActionPanel, Grid, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { search, MemeResult } from "knowyourmeme-js";
import { SearchResult } from "./types";
import {
  ActionCopyUrl,
  ActionOpenExtensionPreferences,
  ActionOpenInBrowser,
  ActionShowDetails,
} from "./components/Actions";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const isGridView = preferences.viewType === "grid";
  const maxResults = preferences.maxResults;

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MemeResult[]>([]);

  useEffect(() => {
    if (!searchText) return;
    setIsLoading(true);
    (async () => {
      const results = await search(searchText, Number(maxResults));
      setData(results);
      setIsLoading(false);
    })();
  }, [searchText, maxResults]);

  if (isGridView) {
    return (
      <Grid
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for memes..."
        throttle
      >
        {isLoading && searchText ? (
          <Grid.EmptyView title="Loading..." icon={Icon.Hourglass} description="Fetching memes..." />
        ) : searchText ? (
          <Grid.Section title="Results" subtitle={data?.length + ""}>
            {data?.map((meme) => (
              <SearchGridItem
                key={meme.link}
                searchResult={{
                  name: meme.title,
                  url: meme.link,
                  image: meme.thumbnail.url,
                }}
              />
            ))}
          </Grid.Section>
        ) : (
          <Grid.EmptyView title="Start Searching" description="Search for a meme to get info about it" />
        )}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for memes..."
        throttle
      >
        {isLoading && searchText ? (
          <List.EmptyView title="Loading..." icon={Icon.Hourglass} description="Fetching memes..." />
        ) : searchText ? (
          <List.Section title="Results" subtitle={data?.length + ""}>
            {data?.map((meme) => (
              <SearchListItem
                key={meme.link}
                searchResult={{
                  name: meme.title,
                  url: meme.link,
                  image: meme.thumbnail.url,
                }}
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView title="Start Searching" description="Search for a meme to get info about it" />
        )}
      </List>
    );
  }
}

function SearchGridItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <Grid.Item
      title={searchResult.name}
      content={{ source: searchResult.image }}
      actions={
        <ActionPanel>
          <ActionShowDetails searchResult={searchResult} />
          <ActionPanel.Section>
            <ActionOpenInBrowser searchResult={searchResult} />
            <ActionCopyUrl searchResult={searchResult} />
          </ActionPanel.Section>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={{
        source: searchResult.image ?? "🖼️",
        mask: Image.Mask.Circle,
      }}
      actions={
        <ActionPanel>
          <ActionShowDetails searchResult={searchResult} />
          <ActionPanel.Section>
            <ActionOpenInBrowser searchResult={searchResult} />
            <ActionCopyUrl searchResult={searchResult} />
          </ActionPanel.Section>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}
