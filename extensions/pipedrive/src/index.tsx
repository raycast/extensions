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
  limit: string;
}

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name of deal, person or organization..." throttle>
      <List.Section title="Results" subtitle={state.results.length + " "}>
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
  //const resultType = `${searchResult.type}`;
  const subtitle = `${searchResult.subtitle}`;
  const accessoryTitleValue = `${searchResult.accessoryTitle}`;

  return (
    <List.Item
      title={searchResult.title}
      subtitle={subtitle}
      accessoryTitle={accessoryTitleValue}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={itemUrl} />
            <CopyToClipboardAction
              title="Copy Deal Email"
              content={searchResult.ccEmail as string}
            />
            <CopyToClipboardAction
              title="Copy Person Email"
              content={searchResult.email as string}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy Person Name"
              content={searchResult.name as string}
            />
            <CopyToClipboardAction
              title="Copy Person Email"
              content={searchResult.email as string}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <CopyToClipboardAction
              title="Copy Person Phone"
              content={searchResult.phone as string}
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
  params.append("item_types", "deal,person,organization");
  params.append("term", searchText);
  params.append("limit", preferences.limit);

  const response = await fetch(`https://${preferences.domain}/api/v1/itemSearch` + "?" + params.toString(), {
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
    const results = jsonResult.item as Json;
    const resultsOrganization = results.organization as Json || "" as string;

    if (results.type as string === "deal") {
      const resultsStage = results.stage as Json || "" as string;
      return {
        id: results.id as string,
        title: results.title as string,
        subtitle: results.status + " " + results.type as string,
        accessoryTitle: resultsOrganization.name as string || "" as string,
        type: results.type as string,
        stage: resultsStage.name as string,
        organization: resultsOrganization.name as string || "" as string,
        status: results.status as string,
        ccEmail: results.cc_email as string,
      };
    }
    else if (results.type as string === "person") {
      const primaryEmail = typeof results.primary_email === 'string' ? results.primary_email : "" as string;
      const resultsPhone = Array.isArray(results.phones) ? results.phones : [];
      const primaryPhone = typeof resultsPhone[0] === 'string' ? resultsPhone[0] : "" as string;
      return {
        id: results.id as string,
        title: results.name as string,
        subtitle: primaryEmail as string + " " + primaryPhone as string,
        accessoryTitle: resultsOrganization.name as string || "" as string,
        type: results.type as string,
        name: results.name as string,
        organization: resultsOrganization.name as string || "" as string,
        email: primaryEmail as string,
        phone: primaryPhone as string,
        status: results.status as string,
      };
    }
    else if (results.type as string === "organization") {
      return {
        id: results.id as string,
        title: results.name as string,
        subtitle: "org" as string,
        accessoryTitle: "" as string,
        type: results.type as string,
      };
    }
    else return {
      id: results.id as string,
      title: results.title as string,
      type: results.type as string,
      organization: resultsOrganization.name as string,
      status: results.status as string,
      ccEmail: results.cc_email as string,
      email: "no-email" as string,
      phone: "no-phone" as string,
    }
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  accessoryTitle?: string;
  type: string;
  stage?: string;
  organization?: string;
  status?: string;
  ccEmail?: string;
  email?: string;
  name?: string;
  phone?: string;
}
