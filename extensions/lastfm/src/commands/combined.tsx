import React from "react";
import { ActionPanel, showToast, Icon, Toast, List, Action } from "@raycast/api";

// Hooks
import { useTopTracks } from "../hooks/useTopTracks";
import { useRecentTracks } from "../hooks/useRecentTracks";

// Types
import type { Track, TopTrack } from "@/types";

const LastFm: React.FC = () => {
  // Fetch songs
  const { loading: topLoading, error: topError, songs: topSongs } = useTopTracks({ limit: "6" });

  const { loading: recentLoading, error: recentError, songs: recentSongs } = useRecentTracks({ limit: "10" });

  if (recentError !== null || topError !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(recentError || topError));
  }

  return (
    <List isLoading={recentLoading || topLoading} searchBarPlaceholder="Search songs...">
      <List.Section title="Top Songs">
        {topSongs.map((s, idx) => {
          const song = s as TopTrack;
          const image = song.image.find((image) => image.size === "large")?.["#text"];
          const artist = song.artist?.name;

          return (
            <List.Item
              key={`${song.name}-${idx}`}
              icon={image}
              title={song.name}
              subtitle={artist ? `by ${artist}` : undefined}
              accessoryTitle={song.playcount ? `${song.playcount} plays` : undefined}
              accessoryIcon={Icon.Star}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={song.url} title="Open on Last.fm" />
                  <Action.CopyToClipboard title="Copy URL to Clipboard" content={song.url} />
                  <Action.CopyToClipboard title="Copy Name and Artist" content={`${song.name} - ${artist}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Recent Songs">
        {recentSongs.map((s, idx) => {
          const song = s as Track;
          const image = song.image.find((image) => image.size === "large")?.["#text"];
          const artist = song.artist?.["#text"];

          return (
            <List.Item
              key={`${song.name}-${idx}`}
              icon={image}
              title={song.name}
              subtitle={artist ? `by ${artist}` : undefined}
              accessoryTitle={song.playcount ? `${song.playcount} plays` : undefined}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={song.url} title="Open on Last.fm" />
                  <Action.CopyToClipboard title="Copy URL to Clipboard" content={song.url} />
                  <Action.CopyToClipboard title="Copy Name and Artist" content={`${song.name} - ${artist}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};

export default LastFm;
