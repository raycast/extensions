import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import type { Platform } from "./types";

export default function Command() {
  const { state } = useSearch();

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Filter platforms..." enableFiltering throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Platform }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.name.toLowerCase()}.png`}
      subtitle={searchResult.defaultLanguage}
      accessoryTitle={`${searchResult.projectCount.toLocaleString()} packages available`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
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

async function performSearch(searchText: string, signal: AbortSignal): Promise<Platform[]> {
  const response = await fetch("https://libraries.io/api/platforms", {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as
    | { name: string; project_count: number; homepage: string; default_language: string }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      name: result.name,
      projectCount: result.project_count,
      homepage: result.homepage,
      defaultLanguage: result.default_language,
    };
  });
}

interface SearchState {
  results: Platform[];
  isLoading: boolean;
}
