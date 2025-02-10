import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { useExec } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

// Define minimal Org type.
type Org = {
  username: string;
  alias: string;
  instanceUrl: string;
};

// Type for each search record returned from the FIND query.
type SearchRecord = {
  Id: string;
  Name: string;
  attributes: {
    type: string;
  };
};

// Overall structure of the FIND query result.
type SearchResult = {
  result: {
    searchRecords: SearchRecord[];
  };
};

// Type for a searchable object (from EntityDefinition query)
type SearchableObject = {
  QualifiedApiName: string;
  Label: string;
  DurableId: string;
};

// Define Preferences interface for your extension.
interface Preferences {
  searchLimit: string;
}

export default function GlobalSearchResultsView({ org }: { org: Org }) {
  const targetOrg = org.alias || org.username;
  const preferences = getPreferenceValues<Preferences>();
  const limitValue = parseInt(preferences.searchLimit, 10) || 50;

  const [searchText, setSearchText] = useState("");
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [searchableObjects, setSearchableObjects] = useState<SearchableObject[]>([]);
  const [selectedType, setSelectedType] = useState("all");

  // Step 1: Retrieve Searchable Objects from Salesforce
  const searchableQuery = `sf data query --query "SELECT QualifiedApiName, Label, DurableId FROM EntityDefinition WHERE IsSearchable = true AND IsQueryable = true AND IsCustomSetting = false AND IsDeprecatedAndHidden = false ORDER BY QualifiedApiName" --target-org "${targetOrg}" --json`;
  const { data: searchableData } = useExec(searchableQuery, [], { shell: true });

  useEffect(() => {
    async function parseSearchableObjects() {
      if (searchableData) {
        try {
          const parsed = JSON.parse(searchableData);
          const objs: SearchableObject[] = parsed.result.records || [];
          const filteredObjs = objs.filter(
            (obj) => !["AssetRelationship", "AssignmentRule"].includes(obj.QualifiedApiName),
          );
          const customObjects = filteredObjs.filter((obj) => obj.DurableId !== obj.QualifiedApiName);
          setSearchableObjects(customObjects);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to parse searchable objects",
            message: errorMessage,
          });
        }
      }
    }
    parseSearchableObjects();
  }, [searchableData]);

  // Step 2: Build a Dynamic FIND Query
  const standardFragments = [
    "Account(Id,Name)",
    "Contact(Id,Name)",
    "Opportunity(Id,Name)",
    "Campaign(Id,Name)",
    "Case(Id,CaseNumber)",
    "Product2(Id,Name)",
  ];

  const customFragments =
    searchableObjects.length > 0 ? searchableObjects.map((obj) => `${obj.QualifiedApiName}(Id,Name)`) : [];

  const returningClause = standardFragments.concat(customFragments).join(", ");
  const trimmedSearchText = searchText.trim();
  const shouldSearch = trimmedSearchText.length > 0;
  const sanitizedSearchText = trimmedSearchText.replace(/[^\w\s.@]/g, "");

  const findQuery =
    shouldSearch && returningClause
      ? `FIND {${sanitizedSearchText}} IN ALL FIELDS RETURNING ${returningClause} LIMIT ${limitValue}`
      : "";

  const queryCommand =
    shouldSearch && findQuery.length > 0
      ? `sf data search --query "${findQuery}" --target-org "${targetOrg}" --json`
      : `echo '{ "result": { "searchRecords": [] } }'`;

  // Step 3: Execute the FIND Query
  const { isLoading, data, revalidate } = useExec(queryCommand, [], { shell: true });

  useEffect(() => {
    async function parseSearchResults() {
      if (data) {
        try {
          const parsed: SearchResult = JSON.parse(data);
          setRecords(parsed.result.searchRecords || []);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to parse search results",
            message: errorMessage,
          });
        }
      } else {
        setRecords([]);
      }
    }
    parseSearchResults();
  }, [data]);

  const filteredRecords =
    selectedType === "all" ? records : records.filter((record) => record.attributes.type === selectedType);

  // Step 4: Action Handlers
  async function handleOpenRecord(record: SearchRecord) {
    try {
      const relativeRecordPath = `/lightning/r/${record.attributes.type}/${record.Id}/view`;
      const execPromise = promisify(exec);
      await execPromise(`sf org open -p "${relativeRecordPath}" --target-org "${targetOrg}"`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open record",
        message: errorMessage,
      });
    }
  }

  async function handleSearchInBrowser() {
    if (!trimmedSearchText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a search term",
      });
      return;
    }
    const payload = {
      componentDef: "forceSearch:searchPageDesktop",
      attributes: {
        term: trimmedSearchText,
        scopeMap: { type: "TOP_RESULTS" },
        groupId: "DEFAULT",
      },
      state: {},
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const fullUrl = `${org.instanceUrl}/one/one.app#${encodedPayload}`;
    try {
      const execPromise = promisify(exec);
      await execPromise(`sf org open -p "${fullUrl}" --target-org "${targetOrg}"`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Global Search failed",
        message: errorMessage,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle="Salesforce Global Search"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter By SObject" onChange={setSelectedType} value={selectedType}>
          <List.Dropdown.Item title="All" value="all" />
          {Array.from(new Set(records.map((r) => r.attributes.type)))
            .sort()
            .map((type) => (
              <List.Dropdown.Item key={type} title={type} value={type} />
            ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Search in Browser" icon={Icon.Globe} onAction={handleSearchInBrowser} />
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      <List.Section title="Search Results">
        {filteredRecords.map((record) => (
          <List.Item
            key={record.Id}
            title={record.Name}
            subtitle={record.attributes.type}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title={`Open ${record.attributes.type} Record`}
                  icon={Icon.Globe}
                  onAction={() => handleOpenRecord(record)}
                />
                <Action title="Search in Browser" icon={Icon.Globe} onAction={handleSearchInBrowser} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
