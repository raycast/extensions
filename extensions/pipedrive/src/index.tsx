import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { URLSearchParams } from "node:url";

interface Preferences {
  domain: string;
  apiToken: string;
  limit: string;
}

export default function Command() {
  const { state, search } = useSearch();
  const [filterValue, setFilterValue] = useState<string>("");

  const handleFilterChange = useCallback((value: string) => setFilterValue(value), []);

  const filteredResults = useMemo(() => {
    if (filterValue === "") {
      return state.results;
    }
    return state.results.filter((result) => result.type === filterValue);
  }, [state.results, filterValue]);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search by name of deal, person or organization..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter results by type" onChange={handleFilterChange} filtering={true}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Item title="Deals" value="deal" />
          <List.Dropdown.Item title="People" value="person" />
          <List.Dropdown.Item title="Organizations" value="organization" />
        </List.Dropdown>
      }
      throttle
    >
      <List.Section title="Results" subtitle={`${filteredResults.length} `}>
        {filteredResults.map((searchResult) => (
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
      accessories={[{ text: accessoryTitleValue }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={itemUrl} />
            {searchResult.name && ( // Conditionally render if person exists
              <Action.CopyToClipboard
                title="Copy Person Name"
                content={searchResult.name as string}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
            {searchResult.email && ( // Conditionally render if person email exists
              <Action.CopyToClipboard
                title="Copy Person Email"
                content={searchResult.email as string}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            {searchResult.phone && ( // Conditionally render if person phone exists
              <Action.CopyToClipboard
                title="Copy Person Phone"
                content={searchResult.phone as string}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            {searchResult.ccEmail && ( // Conditionally render if person ccEmail exists
              <Action.CopyToClipboard title="Copy Deal Email" content={searchResult.ccEmail as string} />
            )}
            {searchResult.ccEmail && ( // Conditionally render if organization exists on a deal
              <Action.CopyToClipboard
                title="Copy Deal Org Name"
                content={accessoryTitleValue as string}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {searchResult.subtitle === "org" && ( // Conditionally render if an organization
              <Action.CopyToClipboard
                title="Copy Org Name"
                content={searchResult.title as string}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
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
      setState((prevState) => ({
        ...prevState,
        isLoading: true,
      }));
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((prevState) => ({
        ...prevState,
        results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("Search error:", error);
      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const { apiToken, domain, limit } = getPreferenceValues();

  const params = new URLSearchParams();
  params.append("api_token", apiToken);
  params.append("include_fields", "deal.cc_email");
  params.append("item_types", "deal,person,organization");
  params.append("term", searchText);
  params.append("limit", limit);

  const url = `https://${domain}/api/v1/itemSearch?${params.toString()}`;

  const response = await fetch(url, { method: "get", signal });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = await response.json();
  const jsonData = json as { data: { items: any[] } }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const jsonResults = jsonData.data?.items;

  return jsonResults.map(
    (
      jsonResult: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => {
      const results = jsonResult.item;
      const resultsOrganization = results.organization?.name || "";

      switch (results.type) {
        case "deal": {
          const resultsStage = Array.isArray(results.stages) ? results.stages[0] : "";
          return {
            id: results.id,
            title: results.title,
            subtitle: `${results.status} ${results.type}`,
            accessoryTitle: resultsOrganization,
            type: results.type,
            stage: resultsStage.name,
            organization: resultsOrganization,
            status: results.status,
            ccEmail: results.cc_email,
          };
        }
        case "person": {
          const primaryEmail = typeof results.primary_email === "string" ? results.primary_email : "";
          const resultsPhone = Array.isArray(results.phones) ? results.phones : [];
          const primaryPhone = typeof resultsPhone[0] === "string" ? resultsPhone[0] : "";
          return {
            id: results.id,
            title: results.name,
            subtitle: `${primaryEmail} ${primaryPhone}`,
            accessoryTitle: resultsOrganization,
            type: results.type,
            name: results.name,
            organization: resultsOrganization,
            email: primaryEmail,
            phone: primaryPhone,
            status: results.status,
          };
        }
        case "organization": {
          return {
            id: results.id,
            title: results.name,
            subtitle: "org",
            accessoryTitle: "",
            type: results.type,
          };
        }
        default:
          return {
            id: results.id,
            title: results.title,
            type: results.type,
            organization: resultsOrganization,
            status: results.status,
            ccEmail: results.cc_email,
            email: "no-email",
            phone: "no-phone",
          };
      }
    },
  );
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
