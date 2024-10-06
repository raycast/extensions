import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { parse, HTMLElement } from "node-html-parser";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Erlang packages..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.path ?? searchResult.url} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      icon={searchResult.search ? Icon.MagnifyingGlass : "hex.png"}
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[
        {
          icon: undefined,
          tooltip: "",
        },
        {
          text: searchResult.version,
          tooltip: searchResult.version,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
          {searchResult.path ? (
            <ActionPanel.Section title="Hex">
              <Action.OpenInBrowser
                title="View Documentation on hexdocs.pm"
                url={`https://hexdocs.pm/${searchResult.name}`}
              />
              <Action.CopyToClipboard
                title="Copy Mix Config"
                content={`{:${searchResult.name}, "~> ${searchResult.version}"}`}
              />
              <Action.CopyToClipboard
                title="Copy Rebar Config"
                content={`{${searchResult.name}, "${searchResult.version}"}`}
              />
            </ActionPanel.Section>
          ) : null}
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
    [cancelRef, setState],
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
  const searchItem: SearchResult = {
    name: hasSearchText ? `Search ${searchText}` : "Open hex.pm",
    description: hasSearchText ? "on hex.pm" : "",
    search: true,
    url: hasSearchText ? `https://hex.pm/packages?search=${searchText}` : "https://hex.pm",
  };
  const results: SearchResult[] = [searchItem];
  if (!hasSearchText) {
    return results;
  }

  const response = await fetch("https://hex.pm/packages?search=" + searchText + "&sort=recent_downloads", {
    method: "get",
    signal: signal,
  });

  const extractPackages = (container: HTMLElement) => {
    const items = container.querySelectorAll("ul li");

    items.forEach((item) => {
      const nameElement = item.querySelector("a");
      if (!nameElement) {
        return;
      }

      const name = nameElement?.text.trim();
      if (!name) {
        return;
      }

      const path = nameElement.getAttribute("href");
      if (!path) {
        return;
      }

      const description = item.querySelector("p")?.text?.trim();
      const url = `https://hex.pm/${path}`;
      const version = item.querySelector(".version")?.text?.trim();

      results.push({
        name,
        path,
        description,
        url,
        version,
        search: false,
      });
    });
  };

  const root = parse(await response.text());
  const exactMatch = root.querySelector("div.exact-match");
  const packageList = root.querySelector("div.package-list");

  if (!packageList) {
    return Promise.reject(new Error("Could not find search results"));
  }

  if (exactMatch) {
    extractPackages(exactMatch);
  }

  extractPackages(packageList);

  return results;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  path?: string;
  search: boolean;
  description?: string;
  url: string;
  version?: string;
}
