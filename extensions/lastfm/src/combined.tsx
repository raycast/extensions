import React from "react";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";

// Hooks
import useLastFm from "./hooks/useLastfm";

// Types
import type { Track, TopTrack } from "@/types/SongResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period } = getPreferenceValues();

  const {
    loading: topLoading,
    error: topError,
    songs: topSongs,
  } = useLastFm({ username, apikey, period, limit: "6", method: "top" });

  const {
    loading: recentLoading,
    error: recentError,
    songs: recentSongs,
  } = useLastFm({ username, apikey, period, limit: "10", method: "recent" });

  if (recentError !== null || topError !== null) {
    showToast({ style: Toast.Style.Failure, title: "Something went wrong.", message: String(recentError || topError) });
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
              accessories={song.playcount ? [{ text: `${song.playcount} plays`, icon: Icon.Star }] : []}
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
              accessories={song.playcount ? [{ text: `${song.playcount} plays` }] : []}
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
