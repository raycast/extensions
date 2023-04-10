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
import useTopAlbums from "./hooks/useTopAlbums";

// Types
import type { Album } from "@/types/AlbumResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period, limit } = getPreferenceValues();
  const { loading, error, albums } = useTopAlbums({ username, apikey, period, limit });

  if (error !== null) {
    showToast(ToastStyle.Failure, "Something went wrong.", String(error));
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search songs...">
      <List.Section title="Results">
        {albums.map((a, idx) => {
          const album = a as Album;
          const image =
            album.image?.find((image) => image.size === "large")?.["#text"] || "../assets/default-album.jpeg";
          const { url, name } = album.artist;

          return (
            <List.Item
              key={`${album.name}-${idx}`}
              icon={image}
              title={album.name}
              subtitle={name ? `by ${name}` : undefined}
              accessoryTitle={album.playcount ? `${album.playcount} plays` : undefined}
              accessoryIcon={album.playcount ? Icon.Star : undefined}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={album.url} title="Open on Last.fm" />
                  {url && <OpenInBrowserAction url={url} title="Open Artist Page on Last.fm" />}

                  <CopyToClipboardAction title="Copy URL to Clipboard" content={album.url} />
                  <CopyToClipboardAction title="Copy Album Name to Clipboard" content={album.name} />
                  {name && <CopyToClipboardAction title="Copy Artist Name to Clipboard" content={name} />}
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
