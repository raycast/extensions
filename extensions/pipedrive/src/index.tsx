import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

interface Preferences {
  domain: string;
  apiToken: string;
}

export default function Command() {
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

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const preferences: Preferences = getPreferenceValues();
  const itemUrl = `https://${preferences.domain}/${searchResult.type}/${searchResult.id}`;
  const subtitle = `${searchResult.status} ${searchResult.type}`;

  return (
    <List.Item
      title={searchResult.title}
      subtitle={subtitle}
      accessoryTitle={searchResult.stage}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={itemUrl} />
            <CopyToClipboardAction
              title="Copy Deal Email"
              content={searchResult.ccEmail}
              shortcut={{ modifiers: ["cmd"], key: "." }}
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

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    if (searchText.length < 2) {
      setState({ results: [], isLoading: false });
      return;
    }

    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("Search error:", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const preferences: Preferences = getPreferenceValues();

  const params = new URLSearchParams();
  params.append("api_token", preferences.apiToken);
  params.append("include_fields", "deal.cc_email");
  params.append("term", searchText);

  const response = await fetch(`https://${preferences.domain}/v1/deals/search` + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const jsonData = (json?.data as Json) ?? {};
  const jsonResults = (jsonData?.items as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const deal = jsonResult.item as Json;
    const dealStage = deal.stage as Json;
    const dealOrganization = deal.organization as Json;

    return {
      id: deal.id as string,
      title: deal.title as string,
      type: deal.type as string,
      stage: dealStage.name as string,
      organization: dealOrganization.name as string,
      status: deal.status as string,
      ccEmail: deal.cc_email as string,
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  stage: string;
  organization: string;
  status: string;
  ccEmail: string;
}
