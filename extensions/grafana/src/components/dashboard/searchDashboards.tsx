import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, Icon, Color } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

import { preferences } from "../../helpers/preferences";
import { SearchState, Dashboard } from "./interface";

export function SearchDashboards() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Dashboard }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.folderTitle}
      accessoryTitle={searchResult.tags.join(" - ")}
      icon={{ source: Icon.Desktop, tintColor: Color.Orange }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={preferences.rootApiUrl + searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const results = await performSearchOnDashboards(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      setState((oldState) => ({
        ...oldState,
        results: [],
        isLoading: false,
      }));
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearchOnDashboards(searchText: string, signal: AbortSignal): Promise<Dashboard[]> {
  const response = await fetch(
    `
    ${preferences.rootApiUrl}/api/search?limit=10&type=dash-db&query=${searchText.length ? searchText.toString() : ""}
  `,
    {
      method: "get",
      signal: signal,
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${preferences.apikey}`,
      },
    }
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const dashboards = (await response.json()) as Json[];

  return dashboards.map((dashboard) => {
    return {
      id: dashboard.id as number,
      uid: dashboard.uid as string,
      name: dashboard.title as string,
      uri: dashboard.uri as string,
      url: dashboard.url as string,
      slug: dashboard.slug as string,
      type: dashboard.type as string,
      tags: dashboard.tags as string[],
      isStarred: dashboard.isStarred as boolean,
      folderId: dashboard.folderId as number,
      folderUid: dashboard.folderUid as string,
      folderTitle: dashboard.folderTitle as string,
      folderUrl: dashboard.folderUrl as string,
      sortMeta: dashboard.sortMeta as number,
    };
  });
}
