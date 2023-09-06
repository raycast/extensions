/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { AbortError } from "node-fetch";
import { useAuthorizeSite } from "./util/hooks";
import { Site } from "./api/site";
import { fetchUsers } from "./api/confluence";

const DEFAULT_TYPE_FILTER = "atlassian";

export default function People() {
  const site = useAuthorizeSite();
  const { state, search } = useSearch(site);

  const titleText = state.isSearched ? "Search Results" : state.typeFilter == DEFAULT_TYPE_FILTER ? "People" : "Apps";

  const typeDropdown = (
    <List.Dropdown
      tooltip="Filter results"
      onChange={(value) => state.typeFilter !== value && search(state.searchText, value)}
    >
      <List.Dropdown.Item key="altassian" title="People" value={DEFAULT_TYPE_FILTER} icon={Icon.Person} />
      <List.Dropdown.Item key="app" title="Apps" value="app" icon={Icon.Terminal} />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => search(text, state.typeFilter)}
      searchBarPlaceholder="Search People..."
      throttle
      searchBarAccessory={typeDropdown}
    >
      <List.Section title={titleText} subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.url} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.displayName}
      accessories={[{ text: searchResult.email }]}
      icon={{ source: searchResult.profilePicture, mask: Image.Mask.Circle }}
      actions={peopleActionPanel(searchResult.url, searchResult.email)}
    />
  );
}

export const peopleActionPanel = (url: string, email: string) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open in Browser" url={url} />
      <Action.CopyToClipboard title="Copy Email" content={email} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
    </ActionPanel.Section>
  </ActionPanel>
);

function useSearch(site?: any) {
  // TODO: fix type hack
  const [state, setState] = useState<SearchState>({
    searchText: "",
    results: [],
    isLoading: true,
    isSearched: true,
    typeFilter: DEFAULT_TYPE_FILTER,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string, typeFilter: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(site, searchText, typeFilter, cancelRef.current.signal);

        setState((oldState) => ({
          ...oldState,
          searchText,
          results,
          isLoading: false,
          isSearched: !!searchText,
          typeFilter,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          searchText,
          isLoading: false,
          typeFilter,
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
    site && search("", DEFAULT_TYPE_FILTER);
    return () => {
      cancelRef.current?.abort();
    };
  }, [site]);

  return {
    state: state,
    search: search,
  };
}

function mapToSearchResult(item: any, links: any, site: Site) {
  return {
    publicName: item.user.publicName,
    displayName: item.user.displayName,
    accountId: item.user.accountId,
    type: item.user.type,
    email: item.user.email,
    profilePicture: site.url + item.user.profilePicture.path,
    url: links.base + item.url,
  };
}

async function performSearch(
  site: Site,
  searchText: string,
  typeFilter: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const searchResults = (await fetchUsers(site, searchText, signal)) as any;

  return searchResults.results
    .filter((item: any) => item.user.accountType == typeFilter)
    .map((item: any) => mapToSearchResult(item, searchResults._links, site));
}

interface SearchState {
  searchText: string;
  results: SearchResult[];
  isLoading: boolean;
  isSearched: boolean;
  typeFilter: string;
}

interface SearchResult {
  publicName: string;
  displayName: string;
  accountId: string;
  type: string;
  email: string;
  profilePicture: string;
  url: string;
}
