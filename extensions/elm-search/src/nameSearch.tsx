import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
  const { state } = useSearch();

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search by name..." throttle>
      {state.results.map((searchResult) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Package }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.summary}
      accessoryTitle={searchResult.version}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={packageUrl(searchResult, getPreferences().theme)} />
            <OpenInBrowserAction
              title={
                getPreferences().theme === "light" ? "Open in Browser in Dark Mode" : "Open in Browser in Light Mode"
              }
              url={packageUrl(searchResult, getPreferences().theme === "light" ? "dark" : "light")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getPreferences(): Preferences {
  return getPreferenceValues();
}

function packageUrl(elmPackage: Package, theme: Theme): string {
  if (theme == "dark") {
    return `https://dark.elm.dmy.fr/packages/${elmPackage.name}/${elmPackage.version}/`;
  } else {
    return `https://package.elm-lang.org/packages/${elmPackage.name}/${elmPackage.version}/`;
  }
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search();
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search() {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const results = await fetchPackages(cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return { state: state };
}

async function fetchPackages(signal: AbortSignal): Promise<Package[]> {
  const response = await fetch("https://package.elm-lang.org/search.json", {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  return (await response.json()) as Package[];
}

interface Preferences {
  theme: Theme;
}

type Theme = "light" | "dark";

interface SearchState {
  results: Package[];
  isLoading: boolean;
}

interface Package {
  name: string;
  summary: string;
  license: string;
  version: string;
}
