import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchSalesforce } from "./lib/sfdx";
import { OrgListDropdown, useDefaultOrgSelection } from "./org-dropdown";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchRecords }>) {
  const [searchText, setSearchText] = useState(props.arguments.query ?? "");
  const { selectedOrg, setSelectedOrg, orgs } = useDefaultOrgSelection();

  // Search with caching
  const {
    data: results,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (term: string, org: string) => {
      if (!term || !org || term.length < 2) return [];
      return await searchSalesforce(term, org);
    },
    [searchText, selectedOrg],
    {
      keepPreviousData: true,
      execute: searchText.length >= 2 && selectedOrg !== "",
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Accounts, Contacts, Opportunities, Leads, Cases..."
      throttle
      searchBarAccessory={<OrgListDropdown value={selectedOrg} onChange={setSelectedOrg} />}
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Failed"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      )}
      {!error && !selectedOrg && (
        <List.EmptyView
          icon={Icon.Globe}
          title="Select an Org"
          description="Choose a Salesforce org from the dropdown to start searching"
        />
      )}
      {!error && selectedOrg && searchText.length < 2 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start Typing to Search"
          description="Enter at least 2 characters to search"
        />
      )}
      {!error && selectedOrg && searchText.length >= 2 && !isLoading && results?.length === 0 && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results Found"
          description={`No records found for "${searchText}"`}
        />
      )}
      {results?.map((record: Record<string, unknown>, index: number) => {
        const attributes = record.attributes as { type?: string } | undefined;
        const objectType = attributes?.type || "Record";
        const title = String(record.Name || record.Subject || record.CaseNumber || `Record ${index + 1}`);
        const recordId = String(record.Id || "");
        const subtitle = `${objectType} • ${recordId}`;

        const accessories = [
          record.Email && { text: String(record.Email) },
          record.Company && { text: String(record.Company) },
          record.Amount && { text: `$${record.Amount}` },
        ].filter(Boolean);

        const orgData = orgs?.find((o) => (o.alias || o.username) === selectedOrg);
        const recordUrl = `${orgData?.instanceUrl}/lightning/r/${objectType}/${recordId}/view`;

        return (
          <List.Item
            key={`${objectType}-${recordId}-${index}`}
            icon={getIconForType(objectType)}
            title={title}
            subtitle={subtitle}
            accessories={accessories as List.Item.Accessory[]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={recordUrl} title="Open in Salesforce" />
                <Action.CopyToClipboard
                  title="Copy Record Id"
                  content={recordId}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={recordUrl}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
                <Action.CopyToClipboard
                  title="Copy as JSON"
                  content={JSON.stringify(record, null, 2)}
                  shortcut={{ modifiers: ["cmd"], key: "j" }}
                />
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  quicklink={{ link: recordUrl, name: title }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Helper function to get icon based on object type
function getIconForType(objectType: string): Icon {
  switch (objectType) {
    case "Account":
      return Icon.Building;
    case "Contact":
      return Icon.Person;
    case "Opportunity":
      return Icon.Star;
    case "Lead":
      return Icon.PersonCircle;
    case "Case":
      return Icon.QuestionMarkCircle;
    default:
      return Icon.Document;
  }
}
