import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

// Types for org and SObject.
type Org = {
  username: string;
  alias: string;
  orgId: string;
  instanceUrl: string;
};

type SObject = {
  Label: string | null;
  DeveloperName: string | null;
};

type RecordResult = {
  [key: string]: unknown;
};

// Preferences interface for additional search fields.
interface Preferences {
  additionalSearchFields: string;
}

function getObjectApiName(sobject: SObject): string {
  if (
    sobject.DeveloperName &&
    sobject.DeveloperName.trim() !== "" &&
    sobject.DeveloperName.trim().toLowerCase() !== "null"
  ) {
    let devName = sobject.DeveloperName.trim();
    if (devName.toLowerCase() === "global") return "global";
    if (devName.includes("_") && !devName.endsWith("__c")) {
      devName = devName.toLowerCase();
      return devName + "__c";
    }
    return devName;
  } else if (sobject.Label) {
    let cleanLabel = sobject.Label.trim().replace(/\s+/g, "_");
    if (cleanLabel.toLowerCase() === "all") return "global";
    if (!cleanLabel.endsWith("__c")) {
      cleanLabel = cleanLabel.toLowerCase();
      return cleanLabel + "__c";
    }
    return cleanLabel;
  }
  return "UnknownObject";
}

/**
 * Parses the additionalSearchFields preference string.
 * Expected format: "account,name,accountNumber__C,oppAmountThisYear__c;contact,name,preferred_first_name__c,mobilephone,mailingstreet"
 * Returns a Map where each key (sobject in lowercase) maps to an array of extra field names.
 */
function parseAdditionalSearchFields(pref: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!pref || pref.trim() === "") return map;
  const groups = pref.split(";");
  groups.forEach((group) => {
    const tokens = group.split(",").map((token) => token.trim());
    if (tokens.length > 1) {
      const sobjectName = tokens[0].toLowerCase();
      const fields = tokens.slice(1).filter((t) => t);
      map.set(sobjectName, fields);
    }
  });
  return map;
}

export default function SalesforceSearchView({ org, sobject }: { org: Org; sobject: SObject }) {
  // Compute the API name once.
  const apiNameValue = getObjectApiName(sobject);
  const isGlobal = apiNameValue === "global";

  // Read extension preferences.
  const preferences = getPreferenceValues<Preferences>();
  const searchFieldMap = parseAdditionalSearchFields(preferences.additionalSearchFields);
  const currentObjKey = apiNameValue.toLowerCase();
  // For SELECT clause we include Id and Name plus any additional fields.
  const selectFields = searchFieldMap.has(currentObjKey)
    ? ["Id", "Name", ...searchFieldMap.get(currentObjKey)!]
    : ["Id", "Name"];
  // For the WHERE conditions, we search only on textual fields (exclude Id).
  const conditionFields = selectFields.filter((f) => f.toLowerCase() !== "id");

  const [searchText, setSearchText] = useState("");
  const [records, setRecords] = useState<RecordResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchText) {
      setRecords([]);
      return;
    }
    // For global search, we do not run a CLI query.
    if (isGlobal) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Build the condition string for each field using the search text.
    const conditions = conditionFields.map((field) => `${field} LIKE '%${searchText}%'`).join(" OR ");
    const fieldCondition = conditions ? `WHERE (${conditions})` : "";

    // Build the SOQL query.
    const soql = `SELECT ${selectFields.join(", ")} FROM ${apiNameValue} ${fieldCondition} LIMIT 50`;
    const execPromise = promisify(exec);
    execPromise(`sf data query --query "${soql}" --json --target-org ${org.alias || org.username}`)
      .then(({ stdout }: { stdout: string }) => {
        try {
          const result = JSON.parse(stdout);
          setRecords(result.result.records || []);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          showToast({ style: Toast.Style.Failure, title: "Error parsing records", message: errorMessage });
        }
      })
      .catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: errorMessage });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchText, org, apiNameValue, isGlobal, conditionFields, selectFields, searchFieldMap]);

  // Global search: construct a Salesforce search URL.
  async function handleGlobalSearch() {
    const payload = {
      componentDef: "forceSearch:searchPageDesktop",
      attributes: {
        term: searchText,
        scopeMap: { type: "TOP_RESULTS" },
        groupId: "DEFAULT",
      },
      state: {},
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const fullUrl = `${org.instanceUrl}/one/one.app#${encodedPayload}`;

    // Use the URL API to extract the relative portion (pathname + search + hash)
    const urlObj = new URL(fullUrl);
    const relativeGlobalPath = urlObj.pathname + urlObj.search + urlObj.hash;
    const targetOrg = org.alias || org.username;

    try {
      const execPromise = promisify(exec);
      await execPromise(`sf org open -p "${relativeGlobalPath}" --target-org "${targetOrg}"`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Global Search failed",
        message: errorMessage,
      });
    }
  }

  // If global search is active, display a simple list to trigger it.
  if (isGlobal) {
    return (
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        navigationTitle="Global Search"
        searchBarPlaceholder="Type search terms"
      >
        {searchText ? (
          <List.Item
            title={`Search Salesforce for "${searchText}"`}
            actions={
              <ActionPanel>
                <Action title="Search in Browser" icon={Icon.Globe} onAction={handleGlobalSearch} />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView icon={Icon.MagnifyingGlass} title="Enter a search term" />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`Search ${sobject.Label || apiNameValue}`}
      searchBarPlaceholder="Type search terms"
    >
      {records.map((record) => (
        <List.Item
          key={String(record.Id)}
          title={record.Name as string}
          subtitle={`ID: ${record.Id}`}
          detail={
            <List.Item.Detail
              markdown={`# ${record.Name}`}
              metadata={
                <List.Item.Detail.Metadata>
                  {selectFields.map((field) => (
                    <List.Item.Detail.Metadata.Label
                      key={field}
                      title={field}
                      text={
                        field.toLowerCase() === "id"
                          ? String(record.Id)
                          : record[field]
                            ? record[field]?.toString()
                            : "Not available"
                      }
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Record"
                icon={Icon.Globe}
                onAction={async () => {
                  try {
                    const relativeRecordPath = `/lightning/r/${apiNameValue}/${record.Id}/view`;
                    const execPromise = promisify(exec);
                    await execPromise(
                      `sf org open -p "${relativeRecordPath}" --target-org "${org.alias || org.username}"`,
                    );
                  } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to open record",
                      message: errorMessage,
                    });
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy to Clipboard" content={String(record.Id)} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No records found" />
    </List>
  );
}
