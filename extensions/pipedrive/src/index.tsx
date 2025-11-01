import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";

export default function PipedriveSearch() {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState<string>("");
  const state = useSearch(searchText);

  const filteredResults = useMemo(() => {
    const results = state.results ?? [];
    if (filterValue === "") {
      return results;
    }
    return results.filter((result) => result?.type === filterValue);
  }, [state.results, filterValue]);

  const handleFilterChange = useCallback((value: string) => setFilterValue(value), []);
  const handleSearchTextChange = useCallback((value: string) => setSearchText(value), []);

  const emojiMap: { [key: string]: string } = {
    deal: "💰",
    person: "🅿️",
    organization: "🅾️",
    email: "📧",
    activities: "📝",
    search: "🔎",
  };

  const preferences: Preferences = getPreferenceValues();
  const addNewPersonURL = `https://${preferences.domain}/persons#dialog/person/add`;
  const addNewDealURL = `https://${preferences.domain}/deals#dialog/deal/add`;
  const addNewOrganizationURL = `https://${preferences.domain}/organizations#dialog/organization/add`;
  const openEmailURL = `https://${preferences.domain}/mail/inbox`;
  const openActivitiesURL = `https://${preferences.domain}/activities/list`;
  const addNewPersonShortcut = { modifiers: ["cmd"], key: "n" };
  const addNewDealShortcut = { modifiers: ["cmd"], key: "d" };
  const addNewOrganizationShortcut = { modifiers: ["cmd"], key: "o" };
  const openEmailShortcut = { modifiers: ["cmd"], key: "e" };
  const openActivitiesShortcut = { modifiers: ["cmd"], key: "t" };

  const openInBrowserItems = [
    {
      id: "addNewPerson",
      title: emojiMap["person"] + "   Add New Person",
      url: addNewPersonURL,
      shortcut: addNewPersonShortcut,
    },
    {
      id: "addNewDeal",
      title: emojiMap["deal"] + "   Add New Deal",
      url: addNewDealURL,
      shortcut: addNewDealShortcut,
    },
    {
      id: "addNewOrganization",
      title: emojiMap["organization"] + "   Add New Organization",
      url: addNewOrganizationURL,
      shortcut: addNewOrganizationShortcut,
    },
    {
      id: "openEmail",
      title: emojiMap["email"] + "   Open Email",
      url: openEmailURL,
      shortcut: openEmailShortcut,
    },
    {
      id: "openActivities",
      title: emojiMap["activities"] + "   Open Activities",
      url: openActivitiesURL,
      shortcut: openActivitiesShortcut,
    },
  ];

  function showOpenInBrowserActions() {
    return (
      <List.Section title="Open In Browser">
        {openInBrowserItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                  <Action.OpenInBrowser
                    title="Add New Person"
                    url={addNewPersonURL}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    icon={emojiMap["person"]}
                  />
                  <Action.OpenInBrowser
                    title="Add New Deal"
                    url={addNewDealURL}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    icon={emojiMap["deal"]}
                  />
                  <Action.OpenInBrowser
                    title="Add New Organization"
                    url={addNewOrganizationURL}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    icon={emojiMap["organization"]}
                  />
                  <Action.OpenInBrowser
                    title="Open Email"
                    url={openEmailURL}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    icon={emojiMap["email"]}
                  />
                  <Action.OpenInBrowser
                    title="Open Activities"
                    url={openActivitiesURL}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    icon={emojiMap["activities"]}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  if (!state.results || filteredResults.length === 0) {
    return (
      <List
        isLoading={state.isLoading}
        onSearchTextChange={handleSearchTextChange}
        searchBarPlaceholder="Search by name of deal, person or organization..."
        searchBarAccessory={
          <List.Dropdown tooltip="Filter results by type" onChange={handleFilterChange} filtering={true}>
            <List.Dropdown.Item title="All" value="" icon={emojiMap["search"]} />
            <List.Dropdown.Item title="Deals" value="deal" icon={emojiMap["deal"]} />
            <List.Dropdown.Item title="People" value="person" icon={emojiMap["person"]} />
            <List.Dropdown.Item title="Organizations" value="organization" icon={emojiMap["organization"]} />
          </List.Dropdown>
        }
        throttle
      >
        {showOpenInBrowserActions()}
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search by name of deal, person or organization..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter results by type" onChange={handleFilterChange} filtering={true}>
          <List.Dropdown.Item title="All" value="" icon={emojiMap["search"]} />
          <List.Dropdown.Item title="Deals" value="deal" icon={emojiMap["deal"]} />
          <List.Dropdown.Item title="People" value="person" icon={emojiMap["person"]} />
          <List.Dropdown.Item title="Organizations" value="organization" icon={emojiMap["organization"]} />
        </List.Dropdown>
      }
      throttle
    >
      <List.Section title="Results" subtitle={`${filteredResults.length} `}>
        {filteredResults.map((searchResult) => (
          <SearchListItem
            key={`${searchResult?.type}${searchResult?.id}`}
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
  const preferences = getPreferenceValues();
  const itemUrl = `https://${preferences.domain}/${searchResult.type}/${searchResult.id}`;
  const { title, subtitle, accessoryTitle, name, email, phone, organization, ccEmail } = searchResult;
  const emoji = emojiMap[searchResult.type] || "";

  if (!searchResult) {
    return null;
  }

  return (
    <List.Item
      title={`${emoji}` + "   " + `${title}`}
      subtitle={subtitle}
      accessories={[{ text: accessoryTitle }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={itemUrl} />
            {name && (
              <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            )}
            {email && (
              <Action.CopyToClipboard title="Copy Email" content={email} shortcut={{ modifiers: ["cmd"], key: "e" }} />
            )}
            {phone && (
              <Action.CopyToClipboard title="Copy Phone" content={phone} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            )}
            {organization && (
              <Action.CopyToClipboard
                title="Copy Organization"
                content={organization}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {ccEmail && (
              <Action.CopyToClipboard
                title="Copy Deal Name"
                content={ccEmail}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
            {subtitle === "org" && (
              <Action.CopyToClipboard
                title="Copy Organization Name"
                content={title}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch(searchText: string) {
  const { isLoading, data } = useCachedPromise(
    async (searchText: string) => {
      const results = await performSearch(searchText);
      return results;
    },
    [searchText],
    {
      execute: searchText.length > 1,
      failureToastOptions: {
        title: "Could not perform search",
      },
    },
  );
  return { isLoading, results: data };
}

async function performSearch(searchText: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const { apiToken, domain, limit } = getPreferenceValues<Preferences>();

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
