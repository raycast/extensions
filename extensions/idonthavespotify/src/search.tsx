import fetch from "node-fetch";
import { useState, useCallback, useEffect } from "react";

import { Action, ActionPanel, Icon, List, showToast, Toast, Clipboard } from "@raycast/api";

import type { SpotifyContent, ApiError } from "./@types/global";
import { SpotifyContentLinkType, SpotifyMetadataType } from "./@types/global";

import { SITE_URL, API_URL, SPOTIFY_LINK_REGEX } from "./constants";

import { cacheLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";

const spotifyContentLinksTitles = {
  [SpotifyContentLinkType.YouTube]: "YouTube",
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [spotifyContent, setSpotifyContent] = useState<SpotifyContent>();

  const fetchSpotifyContent = useCallback(
    async (spotifyLink: string) => {
      setSearchText(spotifyLink);
      setSpotifyContent(undefined);

      if (!SPOTIFY_LINK_REGEX.test(spotifyLink)) {
        return;
      }

      setIsLoading(true);

      try {
        const request = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spotifyLink,
          }),
        });

        const spotifyContent = (await request.json()) as SpotifyContent & ApiError;

        if (request.status !== 200) {
          throw new Error(spotifyContent.message);
        }

        setSpotifyContent(spotifyContent);
        cacheLastSearch(spotifyLink, spotifyContent);
      } catch (error) {
        console.error(error);
        setSpotifyContent(undefined);
        showToast(Toast.Style.Failure, "Error", (error as Error).message);
      }

      setIsLoading(false);
    },
    [setSearchText, setIsLoading, setSpotifyContent]
  );

  useEffect(() => {
    (async () => {
      const clipboardText = await Clipboard.readText();
      const lastSearch = getLastSearch();

      if (
        clipboardText &&
        SPOTIFY_LINK_REGEX.test(clipboardText) &&
        !(lastSearch && lastSearch.spotifyLink === clipboardText)
      ) {
        return await fetchSpotifyContent(clipboardText);
      }

      if (lastSearch) {
        setSpotifyContent(lastSearch.spotifyContent);
        setSearchText(lastSearch.spotifyLink);
      }

      setIsLoading(false);
    })();
  }, [fetchSpotifyContent, setIsLoading, setSearchText, setSpotifyContent]);

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
          <List.Section title={spotifyContent.links.length > 0 ? "Listen on" : "Results"}>
            {spotifyContent.links.length === 0 && (
              <List.Item key="no-links" icon={Icon.Info} title="Not available on other platforms" />
            )}
            {spotifyContent.links.map(({ type, url, isVerified }) => (
              <List.Item
                key={type}
                icon={Icon.Link}
                title={spotifyContentLinksTitles[type as SpotifyContentLinkType]}
                subtitle={url}
                accessories={[{ icon: isVerified ? Icon.CheckCircle : null }]}
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
