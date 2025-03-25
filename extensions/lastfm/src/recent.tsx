import React from "react";
import {
  ActionPanel,
  showToast,
  ToastStyle,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  CopyToClipboardAction,
} from "@raycast/api";

// Hooks
import useLastFm from "./hooks/useLastfm";

// Types
import type { Track } from "@/types/SongResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period, limit } = getPreferenceValues();
  const { loading, error, songs } = useLastFm({ username, apikey, period, limit, method: "recent" });

  if (error !== null) {
    showToast(ToastStyle.Failure, "Something went wrong.", String(error));
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search songs...">
      <List.Section title="Results">
        {songs.map((s, idx) => {
          const song = s as Track;
          const image = song.image.find((image) => image.size === "large")?.["#text"];
          const artist = song.artist?.["#text"];
          const nowPlaying = song["@attr"]?.nowplaying || false;

          return (
            <List.Item
              key={`${song.name}-${idx}`}
              icon={image}
              title={song.name}
              subtitle={artist ? `by ${artist}` : undefined}
              accessoryTitle={nowPlaying ? `Now Playing` : undefined}
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
