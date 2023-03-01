/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAsyncEffect } from "use-async-effect";

import {
  fetchFavouriteSpaces,
  fetchRecentlyViewed,
  fetchSearchByText,
  generateBrowserUrl,
  mapToSearchResult,
  SearchResult,
  sortByLastViewed,
} from "./api/confluence";
import { Site } from "./api/site";
import { SearchActions, SearchListItem } from "./SearchResults";
import { useAuthorizeSite } from "./util/hooks";
import { capitalize } from "./util/text";

export default function Command() {
  const site = useAuthorizeSite();
  const { state, search } = useSearch(site);
  const [spaces, setSpaces] = useState([]) as any[];

  useAsyncEffect(async () => {
    if (!site) {
      return;
    }
    const spaces = await fetchFavouriteSpaces(site);
    setSpaces(spaces);
  }, [site]);

  const titleText = state.isRecentResults ? "Recently Viewed" : "Search Results";

  const spacesDropdown = (
    <List.Dropdown
      tooltip="Filter results"
      storeValue={true}
      onChange={(value) => state.spaceFilter !== value && search(state.searchText, value)}
    >
      <List.Dropdown.Item key="all" title="All spaces" value="" />
      <List.Dropdown.Section title="Favourite Spaces">
        {spaces?.results?.map((space: any) => (
          <List.Dropdown.Item key={space.key} title={space.name} value={space.key} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const globalActions = <GlobalSearchActionPanel searchState={state} />;

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => search(text, state.spaceFilter)}
      searchBarPlaceholder="Search Confluence..."
      throttle
      searchBarAccessory={spacesDropdown}
      actions={<SearchActions globalActions={globalActions} />}
    >
      <List.Section title={titleText} subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem
            key={searchResult.url}
            searchResult={searchResult}
            actions={<SearchActions globalActions={globalActions} searchResult={searchResult} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function GlobalSearchActionPanel({ searchState }: { searchState: SearchState }) {
  if (!searchState.browserSearchUrl) return null;

  const actionTitle = searchState.isRecentResults ? "recently viewed" : "search";

  return (
    <ActionPanel.Section title={capitalize(actionTitle)}>
      <Action.OpenInBrowser
        title={`Open ${actionTitle} in browser`}
        url={searchState.browserSearchUrl}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
    </ActionPanel.Section>
  );
}

function useSearch(site?: any) {
  // TODO: fix type hack
  const [state, setState] = useState<SearchState>({
    searchText: "",
    results: [],
    isLoading: true,
    isRecentResults: true,
    spaceFilter: "",
    browserSearchUrl: undefined,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string, spaceFilter: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(site, searchText, spaceFilter, cancelRef.current.signal);

        setState((oldState) => ({
          ...oldState,
          searchText,
          results,
          isLoading: false,
          isRecentResults: !searchText,
          spaceFilter,
          browserSearchUrl: generateBrowserUrl(site, searchText, spaceFilter),
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          searchText,
          isLoading: false,
          spaceFilter,
          browserSearchUrl: generateBrowserUrl(site, searchText, spaceFilter),
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [site, cancelRef, setState]
  );

  useEffect(() => {
    site && search("", "");
    return () => {
      cancelRef.current?.abort();
    };
  }, [site]);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(
  site: Site,
  searchText: string,
  spaceFilter: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const spaceKey = spaceFilter === "" ? undefined : spaceFilter;

  if (searchText) {
    const searchResults = (await fetchSearchByText(site, searchText, spaceKey, signal)) as any;
    return searchResults.results.map((item: any) => mapToSearchResult(item, searchResults._links));
  } else {
    const recentResults = (await fetchRecentlyViewed(site, spaceKey, signal)) as any;
    return sortByLastViewed(recentResults.results.map((item: any) => mapToSearchResult(item, recentResults._links)));
  }
}

interface SearchState {
  searchText: string;
  results: SearchResult[];
  isLoading: boolean;
  isRecentResults: boolean;
  spaceFilter: string;
  browserSearchUrl: undefined | string;
}
