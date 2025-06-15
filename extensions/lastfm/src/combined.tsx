import React from "react";
import {
  ActionPanel,
  showToast,
  Icon,
  ToastStyle,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  CopyToClipboardAction,
} from "@raycast/api";

// Hooks
import useLastFm from "./hooks/useLastfm";

// Types
import type { Track, TopTrack } from "@/types/SongResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period } = getPreferenceValues();

  // Fetch songs
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
    showToast(ToastStyle.Failure, "Something went wrong.", String(recentError || topError));
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
                  <OpenInBrowserAction url={song.url} title="Open on Last.fm" />
                  <CopyToClipboardAction title="Copy URL to Clipboard" content={song.url} />
                  <CopyToClipboardAction title="Copy Name and Artist" content={`${song.name} - ${artist}`} />
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
                  <OpenInBrowserAction url={song.url} title="Open on Last.fm" />
                  <CopyToClipboardAction title="Copy URL to Clipboard" content={song.url} />
                  <CopyToClipboardAction title="Copy Name and Artist" content={`${song.name} - ${artist}`} />
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
