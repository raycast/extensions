import React from "react";
import {
  ActionPanel,
  showToast,
  ToastStyle,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  Icon,
  CopyToClipboardAction,
} from "@raycast/api";

// Hooks
import useLastFm from "./hooks/useLastfm";

// Types
import type { TopTrack } from "@/types/SongResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period, limit } = getPreferenceValues();
  const { loading, error, songs } = useLastFm({ username, apikey, period, limit, method: "top" });

  if (error !== null) {
    showToast(ToastStyle.Failure, "Something went wrong.", String(error));
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search songs...">
      <List.Section title="Results">
        {songs.map((s, idx) => {
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
              accessoryIcon={song.playcount ? Icon.Star : undefined}
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
