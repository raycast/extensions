import React from "react";
import {
  ActionPanel,
  showToast,
  ToastStyle,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  CopyToClipboardAction,
  Icon,
} from "@raycast/api";

// Hooks
import useTopArtists from "./hooks/useTopArtists";

// Types
import type { Artist } from "@/types/ArtistResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period, limit } = getPreferenceValues();
  const { loading, error, artists } = useTopArtists({ username, apikey, period, limit });

  if (error !== null) {
    showToast(ToastStyle.Failure, "Something went wrong.", String(error));
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search songs...">
      <List.Section title="Results">
        {artists.map((a, idx) => {
          const artist = a as Artist;
          const image = artist.image.find((image) => image.size === "large")?.["#text"];

          return (
            <List.Item
              key={`${artist.name}-${idx}`}
              icon={image}
              title={artist.name}
              accessoryTitle={artist.playcount ? `${artist.playcount} plays` : undefined}
              accessoryIcon={artist.playcount ? Icon.Star : undefined}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={artist.url} title="Open on Last.fm" />
                  <CopyToClipboardAction title="Copy URL to Clipboard" content={artist.url} />
                  <CopyToClipboardAction title="Copy Name to Clipboard" content={artist.name} />
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
