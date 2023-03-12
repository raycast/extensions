import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { LyricSearchResponse } from "./types";
import { boldLyricSnippet } from "./utils";

export default function LyricSearch() {
  const [query, setQuery] = useState<string>("");
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [lyrics, setLyrics] = useState<LyricSearchResponse>();

  const { isLoading } = useFetch<LyricSearchResponse>(`https://genius.com/api/search/lyric?q=${query}`, {
    onData: (data) => setLyrics(data),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for song lyrics..."
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail={showDetails}
    >
      {lyrics?.response?.sections?.map((section) => {
        return section.hits.map((hit) => {
          return (
            <List.Item
              key={hit.result.id}
              icon={{ source: hit.result.header_image_thumbnail_url }}
              title={hit.result.title}
              subtitle={hit.result.artist_names}
              detail={
                <List.Item.Detail
                  markdown={`"...${boldLyricSnippet(hit.highlights[0].value, hit.highlights[0].ranges)}..."`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title={"Song"} text={hit.result.title} />
                      <List.Item.Detail.Metadata.Label title={"Artist"} text={hit.result.artist_names} />
                      <List.Item.Detail.Metadata.Link
                        title={"Genius"}
                        target={`https://genius.com${hit.result.path}`}
                        text={`https://genius.com${hit.result.path}`}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Full Lyrics on Genius"
                    url={`https://genius.com${hit.result.path}`}
                  />
                  <Action
                    title={showDetails ? "Hide Details" : "Show Details"}
                    onAction={() => setShowDetails(!showDetails)}
                  />
                </ActionPanel>
              }
            />
          );
        });
      })}
    </List>
  );
}
