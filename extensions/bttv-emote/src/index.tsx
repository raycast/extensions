import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  OpenInBrowserAction,
  showToast, 
  ToastStyle
} from "@raycast/api";

import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

const imageBaseURL = "https://cdn.betterttv.net/emote/";
const browserBaseURL = "https://betterttv.com/emotes/";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Emote }) {
  const listImage = imageBaseURL + searchResult.id + "/1x.png";
  const image1x = imageBaseURL + searchResult.id + "/1x." + searchResult.imageType;
  const image2x = imageBaseURL + searchResult.id + "/2x." + searchResult.imageType;
  const image3x = imageBaseURL + searchResult.id + "/3x." + searchResult.imageType;

  const browserUrl = browserBaseURL + searchResult.id;

  return (
    <List.Item
      title={searchResult.code}
      icon={listImage}
      subtitle={searchResult.imageType}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
          <CopyToClipboardAction
              title="Copy Emote"
              content={image2x}
            />
            <PasteAction
              title="Paste Emote"
              content={image2x}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy 1x Emote"
              content={image1x}
              shortcut={{ modifiers: ["cmd"], key: "s" }}

            />
            <CopyToClipboardAction
              title="Copy 2x Emote"
              content={image2x}
              shortcut={{ modifiers: ["cmd"], key: "m" }}

            />
            <CopyToClipboardAction
              title="Copy 3x Emote"
              content={image3x}
              shortcut={{ modifiers: ["cmd"], key: "l" }}

            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInBrowserAction
              url={browserUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      showToast(
        ToastStyle.Failure, "Error", "Emote not found"
      )
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<Emote[]> {
  const params = new URLSearchParams();
  const blankQuery = "    ";
  params.append("query", searchText.length > 2 ? searchText : blankQuery);
  params.append("offset", "0");
  params.append("limit", "20");


  const response = await fetch("https://api.betterttv.net/3/emotes/shared/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });


  if (!response.ok) {

    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const jsonResults = (json as unknown as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const emoteJson = jsonResult as Json;
    return {
      id: emoteJson.id as string,
      code: emoteJson.code as string,
      imageType: emoteJson.imageType as string,
    };
  });
}

interface SearchState {
  results: Emote[];
  isLoading: boolean;
}

interface Emote {
  id: string;
  code: string;
  imageType: string;
}
