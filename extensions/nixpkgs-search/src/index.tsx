import { getPreferenceValues, List, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetch, showFailureToast } from "@raycast/utils";
import { AVAILABLE_BRANCHES, SEARCH_CONFIG, API_CONFIG } from "./constants";
import { getSearchUrl, buildSearchQuery, parseSearchResponse } from "./api";
import { SearchListItem } from "./components/SearchListItem";
import type { Preferences } from "./types";

export default function Command() {
  const { searchSize = "20", nixosVersion = "unstable" } = getPreferenceValues<Preferences>();

  const searchSizeNum = Math.max(
    SEARCH_CONFIG.minSize,
    Math.min(SEARCH_CONFIG.maxSize, Math.trunc(+searchSize) || SEARCH_CONFIG.defaultSize),
  );
  const [selectedBranch, setSelectedBranch] = useState<string>(nixosVersion);

  const [url, setUrl] = useState<string | undefined>(undefined);
  if (!url) {
    getSearchUrl({ branchName: selectedBranch })
      .then(setUrl)
      .catch((error) => showFailureToast(error, { title: "Could not get search URL" }));
  }

  // Update URL when branch changes
  useEffect(() => {
    getSearchUrl({ branchName: selectedBranch })
      .then(setUrl)
      .catch((error) => showFailureToast(error, { title: "Could not get search URL" }));
  }, [selectedBranch]);

  const [searchText, setSearchText] = useState("");
  const state = useSearch({ url, searchText, searchSize: searchSizeNum });

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nix packages..."
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select NixOS Branch" value={selectedBranch} onChange={setSelectedBranch}>
          {AVAILABLE_BRANCHES.map((branch) => (
            <List.Dropdown.Item key={branch.value} value={branch.value} title={branch.title} />
          ))}
        </List.Dropdown>
      }
    >
      {state.results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No packages found" : "Search NixOS Packages"}
          description={searchText ? "Try a different search term" : "Start typing to search for packages"}
        />
      ) : (
        <List.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <SearchListItem key={searchResult.id} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function useSearch({ url, searchText, searchSize }: { url?: string; searchText: string; searchSize: number }) {
  const { isLoading, data } = useFetch(url!, {
    method: "POST",
    headers: {
      Authorization: API_CONFIG.authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildSearchQuery(searchText, searchSize)),
    parseResponse: parseSearchResponse,
    initialData: [],
    execute: Boolean(url) && searchText.length > 0,
    failureToastOptions: {
      title: "Could not perform search",
    },
  });
  return { isLoading, results: !searchText.length ? [] : data };
}
