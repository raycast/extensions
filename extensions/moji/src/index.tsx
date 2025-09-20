import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      accessoryTitle={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction url={searchResult.url} />
            <CopyToClipboardAction content={searchResult.title} shortcut={{ modifiers: ["cmd"], key: "." }} />
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
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  if (searchText.length === 0) {
    return [];
  }

  let response = await fetch("https://api.mojidict.com/parse/functions/search_v3", {
    method: "POST",
    signal: signal,
    body: JSON.stringify({
      searchText: searchText,
      langEnv: "zh-CN_ja",
      _InstallationId: "7d959a18-48c4-243c-7486-632147466544",
      _ClientVersion: "js2.12.0",
      _ApplicationId: "E62VyFVLMiW7kvbtVq3p",
    }),
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const jsonResults = json?.result as Json;
  const searchResults = (jsonResults?.searchResults as Json[]) ?? [];
  const tarId = searchResults[0]?.tarId as string;
  if (tarId === undefined) {
    return [];
  }
  // if tarId is a link, just return the link
  if (tarId.startsWith("http")) {
    return [
      {
        id: randomId(),
        title: searchResults[0]?.title as string,
        name: "",
        url: tarId,
      },
    ];
  }

  response = await fetch("https://api.mojidict.com/parse/functions/nlt-fetchManyLatestWords", {
    method: "POST",
    signal: signal,
    body: JSON.stringify({
      itemsJson: [{ objectId: tarId }],
      skipAccessories: false,
      _InstallationId: "7d959a18-48c4-243c-7486-632147466544",
      _ClientVersion: "js2.12.0",
      _ApplicationId: "E62VyFVLMiW7kvbtVq3p",
    }),
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }
  const wordJson = (await response.json()) as Json;
  const wordResult = (wordJson?.result as Json)?.result as Json[];
  const details = (wordResult[0]?.subdetails as Json[]) ?? [];
  const searchWord = (wordResult[0]?.word as Json) ?? {};
  return details.map((word) => {
    return {
      id: randomId(),
      title: (word?.title as string) ?? "",
      name: `${searchWord.spell} | ${searchWord.pron} ${searchWord.accent}`,
      url: `https://www.mojidict.com/details/${tarId}` as string,
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  name: string;
  url: string;
}
