import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search packages on Libraries.io..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name + searchResult.platform} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.platform}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.platform}/${searchResult.name}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open Homepage" url={searchResult.homepage} />
            <Action.OpenInBrowser title="Open Repository" url={searchResult.repositoryUrl} />
            <Action.OpenInBrowser
              title="Open Package Manager Page"
              url={searchResult.packageManagerUrl}
              icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
            />
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
  if (!searchText) return Promise.resolve([]);

  const params = new URLSearchParams();
  params.append("q", searchText);

  const response = await fetch("https://libraries.io/api/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as
    | {
        name: string;
        description?: string;
        platform: string;
        homepage: string;
        repository_url: string;
        package_manager_url: string;
      }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      name: result.name,
      description: result.description,
      platform: result.platform,
      homepage: result.homepage,
      repositoryUrl: result.repository_url,
      packageManagerUrl: result.package_manager_url,
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  description?: string;
  platform: string;
  homepage: string;
  repositoryUrl: string;
  packageManagerUrl: string;
}
