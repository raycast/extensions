import React from "react";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";

// Hooks
import useTopAlbums from "./hooks/useTopAlbums";

// Types
import type { Album } from "@/types/AlbumResponse";

const LastFm: React.FC = () => {
  const { username, apikey, period, limit } = getPreferenceValues();
  const { loading, error, albums } = useTopAlbums({ username, apikey, period, limit });

  if (error !== null) {
    showToast({ style: Toast.Style.Failure, title: "Something went wrong.", message: String(error) });
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search albums...">
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
              accessories={album.playcount ? [{ text: `${album.playcount} plays`, icon: Icon.Star }] : []}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={album.url} title="Open on Last.fm" />
                  {url && <Action.OpenInBrowser url={url} title="Open Artist Page on Last.fm" />}
                  <Action.CopyToClipboard title="Copy URL to Clipboard" content={album.url} />
                  <Action.CopyToClipboard title="Copy Album Name to Clipboard" content={album.name} />
                  {name && <Action.CopyToClipboard title="Copy Artist Name to Clipboard" content={name} />}
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
