import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState, useMemo, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import AddContact from "./add-contact";
import AddDeal from "./add-deal";
import AddOrganization from "./add-organization";
import ContactDetail from "./contact-detail";
import DealDetail from "./deal-detail";
import OrganizationDetail from "./organization-detail";
import { buildPipedriveApiUrl, fetchPipedriveJson, isAbortError } from "./pipedrive-client";
import { validatePipedriveDomain } from "./pipedrive-security";

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
    person: "👔",
    organization: "🏛️",
    email: "📧",
    activities: "📝",
    search: "🔎",
  };

  function toTitleCase(input: string): string {
    return input
      .split(" ")
      .filter((s) => s.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const preferences = getPreferenceValues<Preferences.Index>();
  const domainValidation = validatePipedriveDomain(preferences.domain);
  if (!domainValidation.ok) {
    return (
      <List>
        <List.EmptyView
          title="Invalid Pipedrive Domain"
          description={`${domainValidation.error}. Update the extension preferences to continue.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const domain = domainValidation.domain;
  const addNewPersonURL = `https://${domain}/persons/list/user`;
  const addNewDealURL = `https://${domain}/deals/user`;
  const addNewOrganizationURL = `https://${domain}/organizations/list/user`;
  const openEmailURL = `https://${domain}/mail/inbox`;
  const openActivitiesURL = `https://${domain}/activities/list`;

  const openInBrowserItems = [
    {
      id: "openPersons",
      title: emojiMap["person"] + "   Open Persons List",
      url: addNewPersonURL,
    },
    {
      id: "openDeals",
      title: emojiMap["deal"] + "   Open Deals List",
      url: addNewDealURL,
    },
    {
      id: "openOrganizations",
      title: emojiMap["organization"] + "   Open Organizations List",
      url: addNewOrganizationURL,
    },
    {
      id: "openEmail",
      title: emojiMap["email"] + "   Open Email",
      url: openEmailURL,
    },
    {
      id: "openActivities",
      title: emojiMap["activities"] + "   Open Activities",
      url: openActivitiesURL,
    },
  ];

  function showOpenInBrowserActions() {
    return (
      <List.Section title="Open In Browser">
        {openInBrowserItems.map((item) => (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.title}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                  <Action.Push title="Add New Contact" target={<AddContact />} icon="👤" />
                  <Action.Push title="Add New Deal" target={<AddDeal />} icon={emojiMap["deal"]} />
                  <Action.OpenInBrowser
                    title="Add New Person"
                    url={addNewPersonURL}
                    shortcut={Keyboard.Shortcut.Common.New}
                    icon={emojiMap["person"]}
                  />
                  <Action.OpenInBrowser
                    title="Add New Deal"
                    url={addNewDealURL}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    icon={emojiMap["deal"]}
                  />
                  <Action.OpenInBrowser
                    title="Add New Organization"
                    url={addNewOrganizationURL}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    icon={emojiMap["organization"]}
                  />
                  <Action.OpenInBrowser
                    title="Open Email"
                    url={openEmailURL}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "e" }, Windows: { modifiers: ["ctrl"], key: "e" } }}
                    icon={emojiMap["email"]}
                  />
                  <Action.OpenInBrowser
                    title="Open Activities"
                    url={openActivitiesURL}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
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
        selectedItemId={searchText.length >= 2 && !state.isLoading ? "create-contact" : undefined}
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
        {searchText.length >= 2 && !state.isLoading && (
          <List.Section title="Create">
            {(() => {
              const titleCased = toTitleCase(searchText.trim());
              return (
                <>
                  <List.Item
                    id="create-contact"
                    title={`${emojiMap["person"]}   Create contact: ${titleCased}`}
                    subtitle="Create a new contact in Pipedrive"
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Add Contact"
                          target={<AddContact prefillName={titleCased} />}
                          icon={emojiMap["person"]}
                        />
                      </ActionPanel>
                    }
                  />
                  <List.Item
                    id="create-organization"
                    title={`${emojiMap["organization"]}   Create organization: ${titleCased}`}
                    subtitle="Create a new organization in Pipedrive"
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Add Organization"
                          target={<AddOrganization prefillName={titleCased} />}
                          icon={emojiMap["organization"]}
                        />
                      </ActionPanel>
                    }
                  />
                  <List.Item
                    id="create-deal"
                    title={`${emojiMap["deal"]}   Create deal: ${titleCased}`}
                    subtitle="Create a new deal in Pipedrive"
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Create Deal"
                          target={<AddDeal prefillTitle={titleCased} />}
                          icon={emojiMap["deal"]}
                        />
                      </ActionPanel>
                    }
                  />
                </>
              );
            })()}
          </List.Section>
        )}
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
            domain={domain}
            revalidate={state.revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  emojiMap,
  domain,
  revalidate,
}: {
  searchResult: SearchResult;
  emojiMap: { [key: string]: string };
  domain: string;
  revalidate: () => void;
}) {
  const itemUrl = `https://${domain}/${searchResult.type}/${searchResult.id}`;
  const { title, subtitle, accessoryTitle, name, email, phone, organization, ccEmail } = searchResult;
  const emoji = emojiMap[searchResult.type] || "";

  const detailsTarget =
    searchResult.type === "person" ? (
      <ContactDetail id={searchResult.id} />
    ) : searchResult.type === "organization" ? (
      <OrganizationDetail id={searchResult.id} />
    ) : searchResult.type === "deal" ? (
      <DealDetail id={searchResult.id} />
    ) : null;

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
            {detailsTarget && <Action.Push title="Show Details" target={detailsTarget} />}
            <Action.OpenInBrowser
              title="Open in Browser"
              url={itemUrl}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "b" },
                Windows: { modifiers: ["ctrl"], key: "b" },
              }}
            />
            {searchResult.type === "person" && (
              <Action.Push title="Show Details" target={<ContactDetail id={searchResult.id} />} />
            )}
            {searchResult.type === "person" && (
              <Action.Push
                title="Edit Contact"
                target={
                  <AddContact
                    key={`edit-contact-${searchResult.id}`}
                    personIdToEdit={searchResult.id}
                    onSaved={revalidate}
                  />
                }
                icon="✏️"
              />
            )}
            {searchResult.type === "organization" && (
              <Action.Push
                title="Edit Organization"
                target={
                  <AddOrganization
                    key={`edit-organization-${searchResult.id}`}
                    organizationIdToEdit={searchResult.id}
                    onSaved={revalidate}
                  />
                }
                icon="✏️"
              />
            )}
            {searchResult.type === "deal" && (
              <Action.Push
                title="Edit Deal"
                target={
                  <AddDeal key={`edit-deal-${searchResult.id}`} dealIdToEdit={searchResult.id} onSaved={revalidate} />
                }
                icon="✏️"
              />
            )}
            {searchResult.type === "organization" && (
              <Action.Push
                title="Add Contact to This Organization"
                target={<AddContact prefillOrganizationId={searchResult.id} prefillOrganizationName={title} />}
                icon="👤"
              />
            )}
            {(searchResult.type === "person" || searchResult.type === "organization") && (
              <Action.Push
                title="Create Deal"
                target={
                  <AddDeal
                    prefillPersonId={searchResult.type === "person" ? searchResult.id : undefined}
                    prefillPersonName={searchResult.type === "person" ? title : undefined}
                    prefillOrganizationId={searchResult.type === "organization" ? searchResult.id : undefined}
                    prefillOrganizationName={searchResult.type === "organization" ? title : undefined}
                  />
                }
                icon={emojiMap["deal"]}
              />
            )}
            {name && (
              <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Keyboard.Shortcut.Common.New} />
            )}
            {email && (
              <Action.CopyToClipboard title="Copy Email" content={email} shortcut={Keyboard.Shortcut.Common.Edit} />
            )}
            {phone && (
              <Action.CopyToClipboard
                title="Copy Phone"
                content={phone}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
              />
            )}
            {organization && (
              <Action.CopyToClipboard
                title="Copy Organization"
                content={organization}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
            {ccEmail && (
              <Action.CopyToClipboard
                title="Copy Deal Name"
                content={ccEmail}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
              />
            )}
            {subtitle === "org" && (
              <Action.CopyToClipboard
                title="Copy Organization Name"
                content={title}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "o" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "o" },
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch(searchText: string) {
  const abortable = useRef<AbortController | null>(null);
  const { isLoading, data, revalidate } = useCachedPromise(
    async (searchText: string) => {
      const results = await performSearch(searchText, abortable.current?.signal);
      return results;
    },
    [searchText],
    {
      abortable,
      keepPreviousData: true,
      execute: searchText.length > 1,
      onError: (error) => {
        if (isAbortError(error)) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        void showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message,
        });
      },
    },
  );
  return { isLoading, results: data, revalidate };
}

async function performSearch(searchText: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const preferences = getPreferenceValues<Preferences.Index>();
  const { limit } = preferences;

  const searchUrl = buildPipedriveApiUrl(preferences, "/api/v2/itemSearch", {
    term: searchText,
    item_types: "deal,person,organization",
    limit: limit,
  });

  const json = await fetchPipedriveJson<{ data: { items: any[] } }>(preferences, searchUrl, { method: "get", signal }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const items = json.data?.items || [];

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
            id: String(id),
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
            id: String(id),
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
            id: String(id),
            title: name,
            subtitle: "org",
            accessoryTitle: "",
          };
        }
        default: {
          return {
            ...common,
            id: String(id),
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
