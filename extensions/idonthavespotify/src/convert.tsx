import fetch from "node-fetch";
import { useState, useCallback, useEffect } from "react";

import { Action, ActionPanel, Icon, List, showToast, Toast, Clipboard } from "@raycast/api";

import type { SpotifyContent, ApiError } from "./@types/global";

import { SpotifyContentLink, SpotifyMetadataType } from "./@types/global";

import { SITE_URL, API_URL, SPOTIFY_LINK_REGEX } from "./constants";

const spotifyContentLinksTitles = {
  [SpotifyContentLink.Youtube]: "YouTube",
  [SpotifyContentLink.AppleMusic]: "Apple Music",
  [SpotifyContentLink.Tidal]: "Tidal",
  [SpotifyContentLink.SoundCloud]: "SoundCloud",
};

const spotifyContentTypesTitles = {
  [SpotifyMetadataType.Song]: "Song",
  [SpotifyMetadataType.Album]: "Album",
  [SpotifyMetadataType.Playlist]: "Playlist",
  [SpotifyMetadataType.Artist]: "Artist",
  [SpotifyMetadataType.Podcast]: "Podcast",
  [SpotifyMetadataType.Show]: "Show",
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [spotifyContent, setSpotifyContent] = useState<SpotifyContent>();

  const fetchSpotifyContent = useCallback(
    async (text: string) => {
      setSearchText(text);

      if (!text) {
        return;
      }

      setIsLoading(true);

      try {
        const request = await fetch(`${API_URL}?spotifyLink=${text}`);
        const spotifyContent = (await request.json()) as SpotifyContent & ApiError;

        if (request.status !== 200) {
          throw new Error(spotifyContent.error);
        }

        setSpotifyContent(spotifyContent);
      } catch (error) {
        showToast(Toast.Style.Failure, "Error", (error as Error).message);
      }

      setIsLoading(false);
    },
    [setSearchText, setIsLoading, setSpotifyContent]
  );

  useEffect(() => {
    (async () => {
      const clipboardText = await Clipboard.readText();

      if (clipboardText && SPOTIFY_LINK_REGEX.test(clipboardText)) {
        fetchSpotifyContent(clipboardText);
      }
    })();
  }, [fetchSpotifyContent]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={(text) => fetchSpotifyContent(text)}
      throttle
    >
      <List.EmptyView
        icon={{ source: "../assets/small-icon.png" }}
        title="Paste a Spotify Link https://open.spotify.com/track/..."
      />
      {spotifyContent && (
        <>
          <List.Section title={spotifyContentTypesTitles[spotifyContent.type]}>
            <List.Item
              key="spotify-content"
              icon={{ source: spotifyContent.image }}
              title={spotifyContent.title}
              subtitle={spotifyContent.description}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${SITE_URL}?id=${spotifyContent.id}`} />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Links">
            {Object.entries(spotifyContent.links).map(([key, link]) => (
              <List.Item
                key={key}
                icon={Icon.Link}
                title={spotifyContentLinksTitles[key as SpotifyContentLink]}
                subtitle={link}
                accessories={[{ text: key === SpotifyContentLink.Youtube ? "Recommended" : "" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={link} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
