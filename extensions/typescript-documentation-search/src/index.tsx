import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import unescape from "lodash.unescape";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search TypeScript documentation..."
      throttle
    >
      <List.Section title="Results">
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
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
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
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

const URL =
  "https://bgcdyoiyz5-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia for vanilla JavaScript (lite) 3.30.0%3Bdocsearch.js 2.6.3&x-algolia-application-id=BGCDYOIYZ5&x-algolia-api-key=37ee06fa68db6aef451a490df6df7c60";

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch(URL, {
    method: "post",
    signal,
    body: `{"requests":[{"indexName":"typescriptlang","params":"query=${encodeURIComponent(
      searchText
    )}&hitsPerPage=1000"}]}`,
  });

  const json = (await response.json()) as
    | {
        results: RequestResult[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  if (json.results.length === 0) {
    return [];
  }

  return json.results[0].hits.map((hit) => {
    return {
      name: parseName(hit.hierarchy),
      description: "",
      url: hit.url,
    };
  });
}

function parseName(hierarchy: Hierarchy) {
  const values = Object.keys(hierarchy)
    .sort((a, b) => (a > b ? 1 : -1))
    .filter((key: HierarchyKey) => hierarchy[key])
    .map((key: HierarchyKey) => unescape(hierarchy[key] || ""));
  return values.join(" > ");
}

interface Hierarchy {
  lvl0: string | null;
  lvl1: string | null;
  lvl2: string | null;
  lvl3: string | null;
  lvl4: string | null;
  lvl5: string | null;
  lvl6: string | null;
  [key: string]: string | null;
}

type HierarchyKey = keyof Hierarchy;

interface RequestResult {
  hits: {
    url: string;
    hierarchy: Hierarchy;
  }[];
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
