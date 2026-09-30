import { useEffect, useRef, useState } from "react";

// Raycast imports
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

// types
import { SearchResponse, Search } from "./types";

import { reorderActions } from "./helpers";

// get user Prefs
const { ESVApiToken, searchMode, defaultAction } = getPreferenceValues<Preferences.PassageSearch>();

const cache = new Cache({ namespace: "bible-search", capacity: 1000000 });

function readCachedSearches(): Search[] {
  const cached = cache.get("bible-search");
  return cached ? JSON.parse(cached) : [];
}

export default function EsvSearch() {
  const [prevItems, setPrevItems] = useState<Search[]>(readCachedSearches);
  const [query, setQuery] = useState("");
  const [fetchQuery, setFetchQuery] = useState("");

  useEffect(() => {
    if (searchMode !== "live") return;
    const timer = setTimeout(() => setFetchQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { isLoading, data: passages } = useFetch<SearchResponse>(
    `https://api.esv.org/v3/passage/search/?q=${encodeURIComponent(fetchQuery)}`,
    {
      method: "GET",
      headers: {
        Authorization: `${ESVApiToken}`,
      },
      keepPreviousData: true,
      execute: fetchQuery.length > 0,
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `${error} Check your API Key`,
          message: `Your ESV API token is invalid or you have no internet connection.`,
          primaryAction: {
            title: "Change API Key",
            onAction: () => openExtensionPreferences(),
          },
        });
      },
    },
  );

  const [searchResult, setSearchResult] = useState<Search | undefined>(undefined);
  const lastFetchQuery = useRef<string>("");

  const clearCache = () => {
    cache.clear();
    setSearchResult(undefined);
    setPrevItems([]);
    cache.set("bible-search", JSON.stringify([]));
    showToast({
      style: Toast.Style.Success,
      title: `Previous searches removed`,
    });
  };

  const buildSearchActions = (search: Search) => {
    const actions = [
      {
        key: "openEsv",
        element: (
          <Action.OpenInBrowser
            key="openEsv"
            title="Open at ESV.org"
            url={`https://esv.org/${encodeURIComponent(search.refs)}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        ),
      },
      {
        key: "copyResults",
        element: <Action.CopyToClipboard key="copyResults" title="Copy Search Results" content={search.results} />,
      },
      {
        key: "pasteResults",
        element: (
          <Action.Paste
            key="pasteResults"
            title="Paste Search Results"
            content={search.results}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        ),
      },
    ];
    return (
      <ActionPanel>
        {reorderActions(actions, defaultAction)}
        <Action
          title="Clear Previous Searches"
          onAction={clearCache}
          icon={Icon.Eraser}
          shortcut={{ modifiers: ["opt"], key: "backspace" }}
        />
      </ActionPanel>
    );
  };

  useEffect(() => {
    if (!passages) return;
    if (fetchQuery === lastFetchQuery.current) return;
    lastFetchQuery.current = fetchQuery;

    const searchObject: Search = {
      id: fetchQuery,
      q: fetchQuery,
      refs: passages.results.map((i) => i.reference).join(","),
      results: passages.results.map((i) => `\n## ${i.reference}\n${i.content}\n`).join(""),
    };
    setSearchResult(searchObject);

    if (passages.results.length > 0) {
      setPrevItems((prev) => {
        if (prev.some((item) => item.q === searchObject.q)) return prev;
        const updated = [searchObject, ...prev];
        cache.set("bible-search", JSON.stringify(updated));
        return updated;
      });
    }
  }, [passages, fetchQuery]);

  return (
    <List
      isLoading={isLoading && fetchQuery.length > 0}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for a Bible word or phrase..."
      isShowingDetail={prevItems.length > 0 || (searchMode === "manual" && query.length > 0)}
      selectedItemId={searchResult?.id}
      throttle={searchMode === "live"}
    >
      {searchMode === "manual" && query.length > 0 && query !== fetchQuery && (
        <List.Section title="Search">
          <List.Item
            title={`Search: ${query}`}
            icon={Icon.MagnifyingGlass}
            detail={<List.Item.Detail markdown={`Press Enter to search for **${query}**`} />}
            actions={
              <ActionPanel>
                <Action title="Search Bible" icon={Icon.MagnifyingGlass} onAction={() => setFetchQuery(query)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!query && prevItems.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Provide a word or phrase (e.g., “Jesus sea of Galilee”)"
        />
      )}
      {searchResult && searchResult?.results?.length !== 0 && prevItems.length > 0 && (
        <List.Section title="Current Search">
          <List.Item
            title={searchResult.q}
            icon={Icon.MagnifyingGlass}
            id={searchResult.id}
            detail={<List.Item.Detail markdown={searchResult.results} />}
            actions={buildSearchActions(searchResult)}
          />
        </List.Section>
      )}
      {searchResult &&
        searchResult?.results?.length === 0 &&
        (prevItems.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No result found"
            description="Please try another search (e.g., “Jesus sea of Galilee”)"
          />
        ) : (
          <List.Section title="No result found">
            <List.Item title="Please try another search" icon={Icon.XMarkCircle} />
          </List.Section>
        ))}
      <List.Section title="Previous Searches">
        {prevItems
          .filter((i: Search) => i.q !== searchResult?.q)
          .map((item: Search) => (
            <List.Item
              key={item.id}
              title={item.q}
              icon={Icon.MagnifyingGlass}
              detail={<List.Item.Detail markdown={item.results} />}
              actions={buildSearchActions(item)}
            />
          ))}
      </List.Section>
    </List>
  );
}
