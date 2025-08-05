/* eslint-disable @typescript-eslint/no-explicit-any */
import "cross-fetch/polyfill";

import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

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
import { usePromise } from "@raycast/utils";

const { searchAttachments, sort } = getPreferenceValues();

export default function Command() {
  const site = useAuthorizeSite();
  const [searchText, setSearchText] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");
  const state = useSearch(site, searchText, spaceFilter);
  const [spaces, setSpaces] = useState([]) as any[];

  useEffect(() => {
    (async () => {
      if (!site) {
        return;
      }
      const spaces = await fetchFavouriteSpaces(site);
      setSpaces(spaces);
    })();
  }, [site]);

  const titleText = state.isRecentResults ? "Recently Viewed" : "Search Results";

  const spacesDropdown = (
    <List.Dropdown tooltip="Filter results" storeValue={true} onChange={setSpaceFilter}>
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
      onSearchTextChange={setSearchText}
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
        title={`Open ${actionTitle} in Browser`}
        url={searchState.browserSearchUrl}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
    </ActionPanel.Section>
  );
}

function useSearch(site?: Site, searchText = "", spaceFilter = "") {
  const { isLoading, data = [] } = usePromise(
    async (site, searchText, spaceFilter) => {
      if (!site) return [];
      const results = await performSearch(site, searchText, spaceFilter);
      return results;
    },
    [site, searchText, spaceFilter],
    {
      failureToastOptions: {
        title: "Could not perform search",
      },
    },
  );

  const state: SearchState = {
    results: data,
    isLoading,
    isRecentResults: !searchText,
    browserSearchUrl: !site ? undefined : generateBrowserUrl(site, searchText, spaceFilter),
  };
  return state;
}

async function performSearch(
  site: Site,
  searchText: string,
  spaceFilter: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const spaceKey = spaceFilter === "" ? undefined : spaceFilter;

  if (searchText) {
    const searchResults = (await fetchSearchByText(
      { site, text: searchText, includeAttachments: searchAttachments, spaceKey, sort },
      signal,
    )) as any;
    return searchResults.results.map((item: any) => mapToSearchResult(item, searchResults._links));
  } else {
    const recentResults = (await fetchRecentlyViewed(site, spaceKey, signal)) as any;
    return sortByLastViewed(recentResults.results.map((item: any) => mapToSearchResult(item, recentResults._links)));
  }
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  isRecentResults: boolean;
  browserSearchUrl: undefined | string;
}
