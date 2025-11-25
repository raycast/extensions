import { getPreferenceValues, List, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetch, usePromise } from "@raycast/utils";
import { AVAILABLE_BRANCHES, SEARCH_CONFIG, API_CONFIG } from "./constants";
import { getSearchUrl, buildSearchQuery, parseSearchResponse } from "./api";
import { SearchListItem } from "./components/SearchListItem";

export default function Command() {
  const { searchSize = "20" } = getPreferenceValues<Preferences>();

  const searchSizeNum = Math.max(
    SEARCH_CONFIG.minSize,
    Math.min(SEARCH_CONFIG.maxSize, Math.trunc(+searchSize) || SEARCH_CONFIG.defaultSize),
  );
  const [availableBranches, setAvailableBranches] = useState<(typeof AVAILABLE_BRANCHES)[number][]>([
    ...AVAILABLE_BRANCHES,
  ]);
  const [selectedBranch, setSelectedBranch] = useState<string>("unstable");

  // Load stored selected branch and filter unsupported branches on mount
  useEffect(() => {
    let mounted = true;

    async function loadAndFilter() {
      // Try to read stored branch
      try {
        const stored = await LocalStorage.getItem<string>("selectedBranch");
        if (stored) {
          setSelectedBranch(stored);
        }
      } catch {
        // ignore storage errors
      }

      // Check which branches respond successfully and filter unsupported ones
      const checks = await Promise.all(
        AVAILABLE_BRANCHES.map(async (branch) => {
          try {
            const url = await getSearchUrl({ branchName: branch.value });
            // HEAD is a lightweight way to check existence
            const resp = await fetch(url, { method: "HEAD" });
            return resp.ok ? branch : null;
          } catch {
            return null;
          }
        }),
      );

      const supported = checks.filter(Boolean) as (typeof AVAILABLE_BRANCHES)[number][];
      if (mounted) {
        if (supported.length > 0) setAvailableBranches([...supported]);
        // If the currently selected branch is not supported, pick the first supported one
        if (supported.length > 0 && !supported.find((b) => b.value === selectedBranch)) {
          setSelectedBranch(supported[0].value);
          try {
            await LocalStorage.setItem("selectedBranch", supported[0].value);
          } catch {
            /* ignore */
          }
        }
      }
    }

    loadAndFilter();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch the search URL for the selected branch using usePromise to avoid duplicate calls
  const { isLoading: isUrlLoading, data: url } = usePromise(
    async (branchName: string) => {
      const data = await getSearchUrl({ branchName });
      return data;
    },
    [selectedBranch],
    {
      failureToastOptions: {
        title: "Could not get search URL",
      },
    },
  );

  const [searchText, setSearchText] = useState("");
  const state = useSearch({ url, searchText, searchSize: +searchSizeNum });

  return (
    <List
      isLoading={state.isLoading || isUrlLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nix packages..."
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select NixOS Branch" value={selectedBranch} onChange={setSelectedBranch} storeValue>
          {availableBranches.map((branch) => (
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
