import { ActionPanel, Action, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import type { Package, Version } from "./types";

export default function Command() {
  const { state } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter subscriptions..."
      enableFiltering
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Package }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.name.toLowerCase()}.png`}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.platform}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.name}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.homepage} />
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

async function performSearch(searchText: string, signal: AbortSignal): Promise<Package[]> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://libraries.io/api/subscriptions?api_key=${preferences.token}`, {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as
    | {
      project: {
        name: string;
        description?: string;
        platform: string;
        homepage: string;
        repository_url: string;
        package_manager_url: string;
        versions: Version[];
      }
    }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      name: result.project.name,
      description: result.project.description,
      platform: result.project.platform,
      homepage: result.project.homepage,
      repositoryUrl: result.project.repository_url,
      packageManagerUrl: result.project.package_manager_url,
      versions: result.project.versions,
    };
  });
}

interface SearchState {
  results: Package[];
  isLoading: boolean;
}

interface Preferences {
  token: string;
}
