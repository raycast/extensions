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
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search for a Dart/Flutter package..."
      throttle
    >
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
      title={searchResult.name}
      actions={
        <ActionPanel>
          <CopyToClipboardAction title="Copy Install Command" content={`flutter pub add ${searchResult.name}`} />
          <OpenInBrowserAction url={`https://pub.dev/packages/${searchResult.name}`} />
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
  console.log(searchText);
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "" : searchText);

  const response = await fetch("https://pub.dev/api/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });
  console.log(response.url);
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }
  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const jsonResults = (json?.packages as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const packageName = jsonResult.package;
    return {
      id: randomId(),
      name: packageName as string,
      url: "https://pub.dev/api/packages/" + (packageName as string),
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  url: string;
}
