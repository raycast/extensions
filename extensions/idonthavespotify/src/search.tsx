import fetch from "node-fetch";
import { useState, useCallback, useEffect } from "react";

import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";

import type { SearchResult, ApiError } from "./@types/global";
import { ServiceType, MetadataType } from "./@types/global";

import { SITE_URL, API_URL, LINK_REGEX } from "./constants";

import { cacheLastSearch, cleanLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";

const searchResultLinksTitles: Record<ServiceType, string> = {
  [ServiceType.YouTube]: "YouTube",
  [ServiceType.Deezer]: "Deezer",
  [ServiceType.AppleMusic]: "Apple Music",
  [ServiceType.Tidal]: "Tidal",
  [ServiceType.SoundCloud]: "SoundCloud",
  [ServiceType.Spotify]: "Spotify",
};

const searchResultTypesTitles: Record<MetadataType, string> = {
  [MetadataType.Song]: "Song",
  [MetadataType.Album]: "Album",
  [MetadataType.Playlist]: "Playlist",
  [MetadataType.Artist]: "Artist",
  [MetadataType.Podcast]: "Podcast",
  [MetadataType.Show]: "Show",
};

const serviceTypes = Object.values(ServiceType).map((serviceType) => serviceType.toLowerCase());

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<{ searchText: string; searchResult: SearchResult | null }>({
    searchText: "",
    searchResult: null,
  });

  const fetchSearchResult = useCallback(
    async (link: string) => {
      setIsLoading(true);

      if (
        !link ||
        !LINK_REGEX.test(link) ||
        !serviceTypes.some((serviceType) => link.toLowerCase().includes(serviceType.toLowerCase()))
      ) {
        setIsLoading(false);
        return;
      }

      try {
        const request = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ link }),
        });

        const response = (await request.json()) as SearchResult & ApiError;

        if (request.status !== 200) {
          throw new Error(response.message);
        }

        setState((prev) => ({ ...prev, searchResult: response }));
        cacheLastSearch(link, response);
      } catch (error) {
        console.error(error);
        setState((prev) => ({ ...prev, response: null }));
        showToast(Toast.Style.Failure, "Error", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [state.searchText, setIsLoading, setState],
  );

  useEffect(() => {
    (async () => {
      const clipboardText = await Clipboard.readText();
      const lastSearch = getLastSearch();

      if (clipboardText && !(lastSearch?.link === clipboardText)) {
        await fetchSearchResult(clipboardText);
        return;
      }

      if (lastSearch) {
        if (state.searchText !== "") {
          cleanLastSearch();
          return;
        }

        setState({
          searchText: lastSearch.link,
          searchResult: lastSearch.searchResult,
        });
      }
    })();
  }, [fetchSearchResult, setIsLoading, setState]);

  return (
    <List
      isLoading={isLoading}
      searchText={state.searchText}
      onSearchTextChange={(link) => {
        setState({
          searchText: link,
          searchResult: null,
        });

        fetchSearchResult(link);
      }}
      throttle
    >
      {state.searchText === "" && !state.searchResult ? (
        <List.EmptyView title="Paste a Spotify Link https://open.spotify.com/track/..." />
      ) : (
        <>
          {state.searchResult && (
            <List.Section title={searchResultTypesTitles[state.searchResult.type]}>
              <List.Item
                key="spotify-content"
                icon={{ source: state.searchResult.image }}
                title={state.searchResult.title}
                subtitle={state.searchResult.description}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`${SITE_URL}?id=${state.searchResult.universalLink}`} />
                    {state.searchResult.audio && (
                      <>
                        <Action
                          title="Play Audio Preview"
                          icon={Icon.Play}
                          onAction={() => playAudio(state.searchResult?.audio ?? "")}
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
          )}
          {state.searchResult && (
            <List.Section title={state.searchResult.links.length > 0 ? "Listen on" : "Result"}>
              {state.searchResult.links.length === 0 && (
                <List.Item key="no-links" icon={Icon.Info} title="Not available on other platforms" />
              )}
              {state.searchResult.links.map(({ type, url, isVerified }) => (
                <List.Item
                  key={type}
                  icon={Icon.Link}
                  title={searchResultLinksTitles[type as ServiceType]}
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
          )}
        </>
      )}
    </List>
  );
}
