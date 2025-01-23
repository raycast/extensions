import { useState, useCallback, useEffect } from "react";

import { Action, ActionPanel, Clipboard, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import type { SearchResult } from "./@types/global";
import { Adapter, MetadataType } from "./@types/global";

import { SITE_URL } from "./constants";

import { cacheLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";
import { apiCall, isLinkValid } from "./shared/searchToClipboard";

const searchResultLinksTitles: Record<Adapter, string> = {
  [Adapter.YouTube]: "YouTube",
  [Adapter.Deezer]: "Deezer",
  [Adapter.AppleMusic]: "Apple Music",
  [Adapter.Tidal]: "Tidal",
  [Adapter.SoundCloud]: "SoundCloud",
  [Adapter.Spotify]: "Spotify",
};

const searchResultTypesTitles: Record<MetadataType, string> = {
  [MetadataType.Song]: "Song",
  [MetadataType.Album]: "Album",
  [MetadataType.Playlist]: "Playlist",
  [MetadataType.Artist]: "Artist",
  [MetadataType.Podcast]: "Podcast",
  [MetadataType.Show]: "Show",
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<{ searchText: string; searchResult: SearchResult | null }>({
    searchText: "",
    searchResult: null,
  });

  const searchLinks = useCallback(
    async (link: string) => {
      setIsLoading(true);

      try {
        const response = await apiCall(link);
        setState((prev) => ({ ...prev, searchResult: response }));
        cacheLastSearch(link, response);
      } catch (error) {
        console.error(error);
        setState((prev) => ({ ...prev, response: null }));
        showToast(Toast.Style.Failure, "Error", (error as Error).message);
      }

      setIsLoading(false);
    },
    [state.searchText, setIsLoading, setState],
  );

  useEffect(() => {
    (async () => {
      const clipboardText = await Clipboard.readText();
      const lastSearch = getLastSearch();

      if (lastSearch && clipboardText === lastSearch.link) {
        setState({ searchText: lastSearch.link, searchResult: lastSearch.searchResult });
        return;
      }

      if (clipboardText && isLinkValid(clipboardText)) {
        setState((prev) => ({ ...prev, searchText: clipboardText }));
        showToast(Toast.Style.Success, "Link captured from clipboard!");
        await searchLinks(clipboardText);
        return;
      }
    })();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchText={state.searchText}
      onSearchTextChange={(link) => {
        setState({
          searchText: link,
          searchResult: null,
        });

        if (!link) return;

        if (!isLinkValid(link)) {
          showToast(Toast.Style.Failure, "Error", "Invalid link or not supported");
          return;
        }

        searchLinks(link);
      }}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
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
                  title={searchResultLinksTitles[type as Adapter]}
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
