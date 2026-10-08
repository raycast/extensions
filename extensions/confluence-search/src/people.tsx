/* eslint-disable @typescript-eslint/no-explicit-any */
import "cross-fetch/polyfill";

import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useAuthorizeSite } from "./util/hooks";
import { Site } from "./api/site";
import { fetchUsers } from "./api/confluence";
import { usePromise } from "@raycast/utils";

const DEFAULT_TYPE_FILTER = "atlassian";

export default function People() {
  const site = useAuthorizeSite();
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState(DEFAULT_TYPE_FILTER);
  const { isLoading, data = [] } = usePromise(
    async (site, searchText, typeFilter) => {
      if (!site) return [];
      const results = await performSearch(site, searchText, typeFilter);
      return results;
    },
    [site, searchText, typeFilter],
    {
      failureToastOptions: {
        title: "Could not perform search",
      },
    },
  );

  const titleText =
    !isLoading && !!searchText ? "Search Results" : typeFilter == DEFAULT_TYPE_FILTER ? "People" : "Apps";

  const typeDropdown = (
    <List.Dropdown tooltip="Filter results" onChange={setTypeFilter}>
      <List.Dropdown.Item key="atlassian" title="People" value={DEFAULT_TYPE_FILTER} icon={Icon.Person} />
      <List.Dropdown.Item key="app" title="Apps" value="app" icon={Icon.Terminal} />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search People..."
      throttle
      searchBarAccessory={typeDropdown}
    >
      <List.Section title={titleText} subtitle={data.length + ""}>
        {data.map((searchResult) => (
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

async function performSearch(site: Site, searchText: string, typeFilter: string): Promise<SearchResult[]> {
  const searchResults = (await fetchUsers(site, searchText)) as any;

  return searchResults.results
    .filter((item: any) => item.user?.accountType == typeFilter)
    .map((item: any) => mapToSearchResult(item, searchResults._links, site));
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
