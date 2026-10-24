import { useCallback, useEffect, useRef, useState } from "react";

import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";

import type { SearchResult } from "./@types/global";
import { Adapter, MetadataType } from "./@types/global";

import { getSiteUrl } from "./constants";

import { cacheLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";
import { apiCall, isAbortError, isLinkValid } from "./shared/searchToClipboard";

const searchResultLinksTitles: Record<string, string> = {
  [Adapter.YouTube]: "YouTube",
  [Adapter.Deezer]: "Deezer",
  [Adapter.AppleMusic]: "Apple Music",
  [Adapter.Tidal]: "Tidal",
  [Adapter.SoundCloud]: "SoundCloud",
  [Adapter.Spotify]: "Spotify",
  [Adapter.Qobuz]: "Qobuz",
  [Adapter.Bandcamp]: "Bandcamp",
  [Adapter.Pandora]: "Pandora",
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<{ searchText: string; searchResult: SearchResult | null }>({
    searchText: "",
    searchResult: null,
  });

  const searchLinks = useCallback(async (link: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiCall(link, undefined, controller.signal);
      setState((prev) => ({ ...prev, searchResult: response }));
      cacheLastSearch(link, response);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        return;
      }

      console.error(error);
      const message = (error as Error).message;
      setState((prev) => ({ ...prev, searchResult: null }));
      setErrorMessage(message);
      showToast(Toast.Style.Failure, "Error", message);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

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

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [searchLinks]);

  const showErrorView = Boolean(errorMessage) && !state.searchResult && !isLoading;
  const showEmptyPrompt = state.searchText === "" && !state.searchResult && !errorMessage;

  return (
    <List
      isLoading={isLoading}
      searchText={state.searchText}
      onSearchTextChange={(link) => {
        setState({
          searchText: link,
          searchResult: null,
        });
        setErrorMessage(null);

        if (!link) {
          abortControllerRef.current?.abort();
          setIsLoading(false);
          return;
        }

        if (!isLinkValid(link)) {
          abortControllerRef.current?.abort();
          setIsLoading(false);
          setErrorMessage("Invalid link or not supported");
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
      {showEmptyPrompt ? (
        <List.EmptyView title="Paste a music link (Spotify, Apple Music, Deezer, Tidal, etc.)" />
      ) : showErrorView ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't convert link"
          description={errorMessage ?? undefined}
          actions={
            <ActionPanel>
              {isLinkValid(state.searchText) && (
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => searchLinks(state.searchText)}
                />
              )}
              <Action.OpenInBrowser title="Open Website" url={getSiteUrl()} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
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
                    <Action.OpenInBrowser url={`${getSiteUrl()}?id=${state.searchResult.universalLink}`} />
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
                          shortcut={Keyboard.Shortcut.Common.Pin}
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
                  title={searchResultLinksTitles[type] ?? type}
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
