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
import { MetadataType } from "./@types/global";

import { getSiteUrl } from "./constants";

import { cacheLastSearch, getLastSearch } from "./utils/cache";
import { playAudio, stopAudio } from "./utils/audio";
import { apiCall, errorMessage as getErrorMessage, isAbortError } from "./shared/conversion";
import { getPlatformTitle, getUniversalUrl, isKnownMusicLink, isLinkValid } from "./shared/links";

const searchResultTypesTitles: Record<MetadataType, string> = {
  [MetadataType.Song]: "Song",
  [MetadataType.Album]: "Album",
  [MetadataType.Playlist]: "Playlist",
  [MetadataType.Artist]: "Artist",
  [MetadataType.Podcast]: "Podcast",
  [MetadataType.Show]: "Show",
};

export default function Command() {
  const inputChangedRef = useRef(false);
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
      if (controller.signal.aborted) return;
      setState((prev) => ({ ...prev, searchResult: response }));
      cacheLastSearch(link, response);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        return;
      }

      console.error(error);
      const message = getErrorMessage(error);
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
    let disposed = false;
    (async () => {
      try {
        const clipboardText = (await Clipboard.readText())?.trim();
        if (disposed || inputChangedRef.current) return;
        const lastSearch = getLastSearch();

        if (lastSearch && clipboardText === lastSearch.link) {
          setState({ searchText: lastSearch.link, searchResult: lastSearch.searchResult });
          return;
        }

        let instanceUrl: string | undefined;
        try {
          instanceUrl = getSiteUrl();
        } catch {
          // An invalid instance is reported when the user submits a link.
        }
        if (clipboardText && isKnownMusicLink(clipboardText, instanceUrl)) {
          setState({ searchText: clipboardText, searchResult: null });
          await searchLinks(clipboardText);
        }
      } catch (error) {
        if (!disposed && !inputChangedRef.current) setErrorMessage(getErrorMessage(error));
      }
    })();

    return () => {
      disposed = true;
      abortControllerRef.current?.abort();
      stopAudio();
    };
  }, [searchLinks]);

  let siteUrl: string | undefined;
  try {
    siteUrl = getSiteUrl();
  } catch {
    // Invalid preferences are reported by conversion; keep the preferences action accessible.
  }
  const universalUrl =
    state.searchResult && siteUrl ? getUniversalUrl(state.searchResult.universalLink, siteUrl) : undefined;

  const showErrorView = Boolean(errorMessage) && !state.searchResult && !isLoading;
  const showEmptyPrompt = state.searchText === "" && !state.searchResult && !errorMessage;

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Paste a music link…"
      isLoading={isLoading}
      searchText={state.searchText}
      onSearchTextChange={(link) => {
        inputChangedRef.current = true;
        stopAudio();
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
          setErrorMessage("Paste a valid HTTP or HTTPS music link.");
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
              {siteUrl && <Action.OpenInBrowser title="Open Website" url={siteUrl} />}
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
                icon={state.searchResult.image ? { source: state.searchResult.image } : Icon.Music}
                title={state.searchResult.title}
                subtitle={state.searchResult.description}
                actions={
                  <ActionPanel>
                    {state.searchResult.audio && (
                      <>
                        <Action
                          title="Play Audio Preview"
                          icon={Icon.Play}
                          onAction={() => playAudio(state.searchResult?.audio ?? "")}
                        />
                        <Action
                          title="Stop Audio Preview"
                          icon={Icon.Stop}
                          onAction={() => stopAudio()}
                          shortcut={Keyboard.Shortcut.Common.Pin}
                        />
                      </>
                    )}
                    {universalUrl && <Action.OpenInBrowser title="Open Universal Link" url={universalUrl} />}
                    {universalUrl && <Action.CopyToClipboard title="Copy Universal Link" content={universalUrl} />}
                    {state.searchResult.links.length > 0 && (
                      <Action.CopyToClipboard
                        title="Copy All Platform Links"
                        content={state.searchResult.links
                          .map(({ type, url }) => `${getPlatformTitle(type)}: ${url}`)
                          .join("\n")}
                      />
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
                  key={`${type}-${url}`}
                  icon={Icon.Link}
                  title={getPlatformTitle(type)}
                  subtitle={url}
                  accessories={[
                    {
                      icon: isVerified ? Icon.CheckCircle : Icon.QuestionMarkCircle,
                      tooltip: isVerified ? "Verified match" : "Unverified match. Check before sharing.",
                    },
                  ]}
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
