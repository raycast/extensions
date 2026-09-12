import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { SearchSong, playVideo, searchSongs } from "./utils/kaset";

export default function PlaySong() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const { data, isLoading, revalidate } = usePromise(
    async (q: string) => {
      if (!q) return { query: q, songs: [] as SearchSong[] };
      const songs = await searchSongs(q);
      return { query: q, songs };
    },
    [query],
  );

  const hasCurrentResponse = data?.query === query;
  const songs = useMemo(
    () => (hasCurrentResponse ? (data?.songs ?? []) : []),
    [data, hasCurrentResponse],
  );
  const hasQuery = query.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search songs on YouTube Music"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!hasQuery ? (
        <List.EmptyView
          title="Search for a song"
          description="Type a song title, artist, or keywords to start searching."
        />
      ) : !hasCurrentResponse ? (
        <List.EmptyView
          title="Searching..."
          description={`Looking for "${query}" on YouTube Music.`}
        />
      ) : isLoading && songs.length === 0 ? (
        <List.EmptyView
          title="Searching..."
          description="Fetching results..."
        />
      ) : songs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No songs found"
          description="Try a different query."
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        songs.map((song) => <SongItem key={song.id} song={song} />)
      )}
    </List>
  );
}

function SongItem({ song }: { song: SearchSong }) {
  const subtitle = [song.artist, song.album].filter(Boolean).join(" • ");

  return (
    <List.Item
      title={song.title}
      subtitle={subtitle}
      icon={song.artworkURL || Icon.Music}
      accessories={song.duration ? [{ text: song.duration }] : undefined}
      actions={
        <ActionPanel>
          <Action
            title="Play Song"
            icon={Icon.Play}
            onAction={async () => await playVideo(song.id)}
          />
          <Action.CopyToClipboard
            title="Copy Video Id"
            content={song.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
