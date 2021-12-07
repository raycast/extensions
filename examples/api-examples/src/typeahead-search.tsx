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
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
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
      subtitle={searchResult.description}
      accessoryTitle={searchResult.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
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
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "@raycast/api" : searchText);

  const response = await fetch("https://api.npms.io/v2/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const jsonResults = (json?.results as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const npmPackage = jsonResult.package as Json;
    return {
      id: randomId(),
      name: npmPackage.name as string,
      description: (npmPackage?.description as string) ?? "",
      username: ((npmPackage.publisher as Json)?.username as string) ?? "",
      url: (npmPackage.links as Json).npm as string,
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
  description: string;
  username?: string;
  url: string;
}
