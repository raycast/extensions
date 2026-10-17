import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useState, useRef } from "react";
import { parse } from "node-html-parser";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const state = useSearch(searchText);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Go packages..."
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
      icon={searchResult.search ? Icon.MagnifyingGlass : "list-icon.png"}
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[
        {
          icon: searchResult.standardLibrary ? Icon.CheckCircle : undefined,
          tooltip: searchResult.standardLibrary ? "Standard Library" : "",
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
            <ActionPanel.Section title="Go">
              <Action.CopyToClipboard
                title="Copy Package Path"
                content={searchResult.path}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action.CopyToClipboard
                title="Copy Download Command"
                content={`go get ${searchResult.path}`}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function useSearch(search: string) {
  const cancelRef = useRef<AbortController | null>(null);

  const { isLoading, data } = useCachedPromise(
    async function search(searchText: string) {
      const results = await performSearch(searchText, cancelRef.current?.signal);
      return results;
    },
    [search],
    {
      abortable: cancelRef,
      failureToastOptions: {
        title: "Could not perform search",
      },
      initialData: [],
    },
  );
  return { isLoading, results: data };
}

async function performSearch(searchText: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const hasSearchText = searchText.length !== 0;
  const searchItem: SearchResult = {
    name: hasSearchText ? `Search ${searchText}` : "Open pkg.go.dev",
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
    return Promise.reject(new Error("Could not find search results"));
  }

  const items = searchResults.querySelectorAll("div.SearchSnippet");
  if (items.length === 0) {
    return results;
  }

  items.forEach((item) => {
    const name = item.querySelector('[data-test-id="snippet-title"]')?.text?.split("(")[0]?.trim();
    if (!name) {
      return;
    }

    let path = item.querySelector("span.SearchSnippet-header-path")?.text?.trim();
    if (!path) {
      return;
    }
    path = path.slice(1, -1);

    const description = item.querySelector('[data-test-id="snippet-synopsis"]')?.text?.trim();
    const url = `https://pkg.go.dev/${path}`;
    const standardLibrary = !!item.querySelector("span.go-Chip");
    const version = item.querySelector("div.SearchSnippet-infoLabel > span:nth-child(3) > strong")?.text?.trim();

    results.push({
      name,
      path,
      standardLibrary,
      description,
      url,
      version,
      search: false,
    });
  });
  return results;
}

interface SearchResult {
  name: string;
  path?: string;
  standardLibrary: boolean;
  search: boolean;
  description?: string;
  url: string;
  version?: string;
}
