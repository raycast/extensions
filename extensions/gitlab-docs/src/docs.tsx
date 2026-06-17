import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorage } from "@raycast/api";

const baseUrl = "https://docs.gitlab.com/";
const apiUrl = "https://seggenberger.gitlab.io/raycast-gitlab-docs/lunr-map.json";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search GitLab Docs..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult, index) => (
          <SearchListItem key={index} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      icon="docs-icon.png"
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const lastSearchText: string = (await LocalStorage.getItem("GitLabDocs.lastSearch")) || "";
  const urlSearchText = searchText.length > 0 ? searchText : lastSearchText;

  const response = await fetch(apiUrl, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal: signal,
  });

  const json = (await response.json()) as Array<APIResults>;

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  if (searchText.length > 0 && searchText !== lastSearchText) {
    await LocalStorage.setItem("GitLabDocs.lastSearch", searchText);
  }

  const entries: Array<SearchResult> = [];
  const data: Array<APIResults> = Object.values(json);

  data.forEach((item) => {
    if (item.h1.toLowerCase().includes(urlSearchText.toLowerCase())) {
      entries.push({
        name: item.h1,
        description: `${baseUrl}/${item.id}`,
        url: baseUrl + item.id,
      });
    }
  });

  return entries;
}

interface APIResults {
  id: string;
  h1: string;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  description?: string;
  url: string;
}
