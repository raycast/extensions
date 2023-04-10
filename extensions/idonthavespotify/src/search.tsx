import fetch from "node-fetch";
import { useState, useCallback, useEffect } from "react";

import { Action, ActionPanel, Icon, List, showToast, Toast, Clipboard } from "@raycast/api";

import type { SpotifyContent, ApiError } from "./@types/global";
import { SpotifyContentLinkType, SpotifyMetadataType } from "./@types/global";

import { SITE_URL, API_URL, SPOTIFY_LINK_REGEX } from "./constants";

import { cacheLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";

const spotifyContentLinksTitles = {
  [SpotifyContentLinkType.Youtube]: "YouTube",
  [SpotifyContentLinkType.Deezer]: "Deezer",
  [SpotifyContentLinkType.AppleMusic]: "Apple Music",
  [SpotifyContentLinkType.Tidal]: "Tidal",
  [SpotifyContentLinkType.SoundCloud]: "SoundCloud",
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
    async (spotifyLink: string) => {
      setSearchText(spotifyLink);

      if (!spotifyLink) {
        return;
      }

      setIsLoading(true);

      try {
        const request = await fetch(`${API_URL}?spotifyLink=${spotifyLink}&v=2`);
        const spotifyContent = (await request.json()) as SpotifyContent & ApiError;

        if (request.status !== 200) {
          throw new Error(spotifyContent.error);
        }

        setSpotifyContent(spotifyContent);
        cacheLastSearch(spotifyLink, spotifyContent);
      } catch (error) {
        console.error(error);
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
        await fetchSpotifyContent(clipboardText);
        return;
      }

      const lastSearch = getLastSearch();
      if (lastSearch) {
        setSpotifyContent(lastSearch.spotifyContent);
        setSearchText(lastSearch.spotifyLink);
      }
    })();
  }, [fetchSpotifyContent]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={(spotifyLink) => fetchSpotifyContent(spotifyLink)}
      throttle
    >
      <List.EmptyView title="Paste a Spotify Link https://open.spotify.com/track/..." />
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
                  {spotifyContent.audio && (
                    <>
                      <Action
                        title="Play Audio Preview"
                        icon={Icon.Play}
                        onAction={() => playAudio(spotifyContent.audio ?? "")}
                      />
                      <Action
                        title="Stop Audio Preview"
                        icon={Icon.Play}
                        onAction={() => stopAudio()}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Listen on">
            {spotifyContent.links.map(({ type, url, isVerified }) => (
              <List.Item
                key={type}
                icon={Icon.Link}
                title={spotifyContentLinksTitles[type as SpotifyContentLinkType]}
                subtitle={url}
                accessories={[{ text: isVerified ? "Verified" : "" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={url} />
                    <Action.CopyToClipboard title="Copy Link" content={url} />
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
