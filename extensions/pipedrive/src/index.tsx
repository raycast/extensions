import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

interface Preferences {
  domain: string;
  apiToken: string;
  limit: string;
}

export default function PipedriveSearch() {
  const { state, search } = useSearch();
  const [filterValue, setFilterValue] = useState<string>("");

  const handleFilterChange = useCallback((value: string) => setFilterValue(value), []);

  const filteredResults = useMemo(() => {
    if (filterValue === "") {
      return state.results;
    }
    return state.results.filter((result) => result.type === filterValue);
  }, [state.results, filterValue]);

  const emojiMap: { [key: string]: string } = {
    deal: "💰 ",
    person: "🅿️ ",
    organization: "🅾️ ",
  };

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search by name of deal, person or organization..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter results by type" onChange={handleFilterChange} filtering={true}>
          <List.Dropdown.Item title="🔎  All" value="" />
          <List.Dropdown.Item title="💰  Deals" value="deal" />
          <List.Dropdown.Item title="🅿️  People" value="person" />
          <List.Dropdown.Item title="🅾️  Organizations" value="organization" />
        </List.Dropdown>
      }
      throttle
    >
      <List.Section title="Results" subtitle={`${filteredResults.length} `}>
        {filteredResults.map((searchResult) => (
          <SearchListItem
            key={`${searchResult.type}${searchResult.id}`}
            searchResult={searchResult}
            emojiMap={emojiMap}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  emojiMap,
}: {
  searchResult: SearchResult;
  emojiMap: { [key: string]: string };
}) {
  const preferences: Preferences = getPreferenceValues();
  const itemUrl = `https://${preferences.domain}/${searchResult.type}/${searchResult.id}`;
  const subtitle = searchResult.subtitle;
  const accessoryTitle = searchResult.accessoryTitle;
  const emoji = emojiMap[searchResult.type] || "";

  return (
    <List.Item
      title={`${emoji} ${searchResult.title}`}
      subtitle={subtitle}
      accessories={[{ text: accessoryTitle }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={itemUrl} />
            {searchResult.name && ( // Conditionally render if person exists
              <Action.CopyToClipboard
                title="Copy Name"
                content={searchResult.name}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
            {searchResult.email && ( // Conditionally render if person email exists
              <Action.CopyToClipboard
                title="Copy Email"
                content={searchResult.email}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            {searchResult.phone && ( // Conditionally render if person phone exists
              <Action.CopyToClipboard
                title="Copy Phone"
                content={searchResult.phone}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            {searchResult.organization && ( // Conditionally render if organization exists for deal or person
              <Action.CopyToClipboard
                title="Copy Organization"
                content={searchResult.organization}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {searchResult.ccEmail && ( // Conditionally render if deal exists
              <Action.CopyToClipboard
                title="Copy Deal Name"
                content={searchResult.title as string}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
            {searchResult.subtitle === "org" && ( // Conditionally render if organization exists
              <Action.CopyToClipboard
                title="Copy Organization Name"
                content={searchResult.title as string}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: false });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    if (cancelRef.current) {
      cancelRef.current.abort();
    }

    if (searchText.length < 2) {
      setState({ results: [], isLoading: false });
      return;
    }

    cancelRef.current = new AbortController();
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    try {
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
    state,
    search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const { apiToken, domain, limit } = getPreferenceValues();

  const searchUrl = new URL(`https://${domain}/api/v2/itemSearch`);
  searchUrl.searchParams.set("api_token", apiToken);
  searchUrl.searchParams.set("include_fields", "deal.cc_email");
  searchUrl.searchParams.set("item_types", "deal,person,organization");
  searchUrl.searchParams.set("term", searchText);
  searchUrl.searchParams.set("limit", limit);

  const response = await fetch(searchUrl.toString(), { method: "get", signal });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const { data } = (await response.json()) as { data: { items: any[] } }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const items = data?.items || [];

  return items.map(
    ({
      item: {
        id,
        type,
        title,
        organization,
        status,
        cc_email: ccEmail,
        name,
        primary_email: primaryEmail,
        stages,
        phones,
      },
    }) => {
      const organizationName = organization?.name || "";

      const common = {
        id,
        title,
        type,
        organization: organizationName,
        status,
        ccEmail,
      };

      switch (type) {
        case "deal": {
          return {
            ...common,
            subtitle: `${status} ${type}`,
            accessoryTitle: organizationName,
            stage: stages?.[0]?.name || "",
          };
        }
        case "person": {
          const email = primaryEmail || "";
          const phone = phones?.[0] || "";
          return {
            ...common,
            title: name,
            subtitle: `${email} ${phone}`,
            accessoryTitle: organizationName,
            name,
            email,
            phone,
          };
        }
        case "organization": {
          return {
            ...common,
            title: name,
            subtitle: "org",
            accessoryTitle: "",
          };
        }
        default: {
          return {
            ...common,
            email: "no-email",
            phone: "no-phone",
          };
        }
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
