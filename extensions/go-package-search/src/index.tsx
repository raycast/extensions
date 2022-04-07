import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { parse } from "node-html-parser";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Go packages..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
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
      icon={searchResult.search ? Icon.MagnifyingGlass : "list-icon.png"}
      key={searchResult.fullPath}
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ text: searchResult.fullPath, icon: searchResult.standardLibrary ? Icon.Pin : undefined }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={searchResult.url} />
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

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const hasSearchText = searchText.length !== 0;
  const searchItem = {
    name: hasSearchText ? `Search ${searchText}` : "Open pkg.go.dev",
    fullPath: "",
    description: hasSearchText ? "on pkg.go.dev" : "",
    standardLibrary: false,
    search: true,
    url: hasSearchText ? `https://pkg.go.dev/search?q=${searchText}` : "https://pkg.go.dev",
  };

  const results: SearchResult[] = [searchItem];

  if (!hasSearchText) {
    return results;
  }

  const params = new URLSearchParams();
  params.append("q", searchText);
  params.append("limit", "10");

  const response = await fetch("https://pkg.go.dev/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const root = parse(await response.text());
  const searchResults = root.querySelector("div.SearchResults");

  if (!searchResults) {
    throw new Error("Could not find search results");
  }

  const items = searchResults.querySelectorAll("div.SearchSnippet");

  if (items.length === 0) {
    return results;
  }

  items.forEach((item) => {
    const name = item.querySelector('[data-test-id="snippet-title"]')?.text?.split("(")[0]?.trim();
    const fullPath = item.querySelector("span.SearchSnippet-header-path")?.text?.trim();
    const description = item.querySelector('[data-test-id="snippet-synopsis"]')?.text?.trim();
    const url = `https://pkg.go.dev/${fullPath?.slice(1, fullPath.length - 1)}`;
    const standardLibrary = item.querySelector("span.go-Chip") != null;

    if (name == null || fullPath == null || url == null) {
      return;
    }

    results.push({
      name,
      fullPath,
      standardLibrary,
      description,
      url,
      search: false,
    });
  });

  return results;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  fullPath?: string;
  standardLibrary: boolean;
  search: boolean;
  description?: string;
  url: string;
}
