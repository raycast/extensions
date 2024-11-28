import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import os from "os";
import fs from "fs";
import path from "path";
import plist from "plist";

const RECENTS_LIST_PATH = path.join(
  os.homedir(),
  "/Library/Containers/com.apple.ScreenSharing/Data/Library/Application Support/Screen Sharing"
);
const RECENTS_LIST_PATH_SONOMA = path.join(
  os.homedir(),
  "/Library/Containers/com.apple.ScreenSharing/Data/Library/Application Support/Screen Sharing Hosts"
);

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search recent screen shares..."
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

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open Screen Sharing" target={searchResult.path} application="com.apple.ScreenSharing" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      try {
        const results = await performSearch(searchText);
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

        console.error("search error", error);

        if ((error as Error).message?.includes("no such file")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Could not perform search",
            message: "Path to screen sharing not found",
          });
        } else {
          showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
        }
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

let locationsCache: SearchResult[];

async function getLocations() {
  if (locationsCache) {
    return locationsCache;
  }
  const hosts: SearchResult[] = [];

  try {
    const files = await fs.promises.readdir(RECENTS_LIST_PATH);

    files
      .filter((file) => file.endsWith(".vncloc"))
      .forEach((file) => {
        hosts.push({
          name: file.slice(0, file.lastIndexOf(".")),
          path: path.join(RECENTS_LIST_PATH, file),
        });
      });
  } catch (error) {
    console.warn("No pre-sonoma locations found");
  }

  try {
    const files = await fs.promises.readdir(RECENTS_LIST_PATH_SONOMA);
    const plistFiles = files.filter((file) => file.endsWith(".plist"));

    for (const file of plistFiles) {
      try {
        const plistPath = path.join(RECENTS_LIST_PATH_SONOMA, file);
        const plistContent = await fs.promises.readFile(plistPath, "utf-8");
        const data = plist.parse(plistContent);
        if (data) {
          Object.keys(data).forEach((key) => hosts.push({ name: key, path: key }));
        }
      } catch (error) {
        console.error("error parsing plist", error);
      }
    }
  } catch (error) {
    console.warn("No sonoma locations found");
  }

  if (hosts.length === 0) {
    console.error("no hosts found");
    return [];
  }

  locationsCache = Array.from(hosts);

  return locationsCache;
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const locations = await getLocations();
  const searchLower = searchText.toLocaleLowerCase();

  return locations.filter((location) => location.name.toLocaleLowerCase().includes(searchLower));
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  path: string;
}
