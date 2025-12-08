import { Action, ActionPanel, Detail, List, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchLyrics, LrcLibTrack, formatLyrics } from "./utils/lrclib";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: searchResults, isLoading: isLoadingSearch } = usePromise(
    async (query: string) => {
      if (!query) return [];
      return searchLyrics(query);
    },
    [searchText],
    { execute: searchText.length > 0 },
  );

  return (
    <List
      isLoading={isLoadingSearch}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a song..."
      throttle
    >
      {searchResults?.map((result) => (
        <List.Item
          key={result.id}
          title={result.name}
          subtitle={result.artistName}
          accessories={[{ text: result.albumName }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Lyrics"
                target={<LyricsDetail track={result} />}
              />
            </ActionPanel>
          }
        />
      ))}
      {!searchText && (
        <List.EmptyView
          icon="🔍"
          title="Search Lyrics"
          description="Type a song name to search for lyrics."
        />
      )}
    </List>
  );
}

import { Action, ActionPanel, Detail, List, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchLyrics, LrcLibTrack, formatLyrics } from "./utils/lrclib";
import { getArtwork } from "./utils/artwork";

function LyricsDetail({ track }: { track: LrcLibTrack }) {
  const { data: artwork } = usePromise(
    async () => getArtwork(`${track.artistName} ${track.albumName}`),
    [],
    {
      execute: true,
    },
  );

  const albumArtIcon: Image.ImageLike | undefined = artwork
    ? { source: artwork }
    : undefined;

  const lyrics = track.syncedLyrics
    ? formatLyrics(track.syncedLyrics)
    : track.plainLyrics || "*Instrumental*";

  let markdown = "";
  markdown += `## ${track.name} - ${track.artistName}\n\n${lyrics}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Album art" icon={albumArtIcon} />
          <Detail.Metadata.Label title="Track" text={track.name} />
          <Detail.Metadata.Label title="Artist" text={track.artistName} />
          <Detail.Metadata.Label title="Album" text={track.albumName} />
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(track.duration)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
