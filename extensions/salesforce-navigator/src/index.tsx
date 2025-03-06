import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  closeMainWindow,
  Clipboard,
  showHUD,
  getApplications,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useExec, useCachedState } from "@raycast/utils";
import PAGES from "../data/SFPages.json";
import OpenIdView from "./OpenIdView";
import GlobalSearchResultsView from "./GlobalSearchResultsView";
import SalesforceUsersView from "./SalesforceUsersView";
import { exec } from "child_process";
import { promisify } from "util";

// --------------------------
// Type Definitions
// --------------------------
type Org = {
  username: string;
  alias: string;
  orgId: string;
  instanceUrl: string;
};

type SObject = {
  id: string;
  label: string;
  developername: string;
  EditDefinitionUrl?: string;
  QualifiedApiName: string;
};

// New interfaces to replace "any"

// For raw org objects returned by the CLI
interface RawOrg {
  username: string;
  alias?: string;
  orgId: string;
  instanceUrl: string;
}

// To describe the JSON structure of the org list response
interface OrgListResult {
  result?: {
    nonScratchOrgs?: RawOrg[];
    scratchOrgs?: RawOrg[];
  };
}

// For raw SObject objects returned by the CLI
interface RawSObject {
  durableid?: string;
  DurableId?: string;
  Label?: string;
  label?: string;
  MasterLabel?: string;
  QualifiedApiName?: string;
  DeveloperName?: string;
  developername?: string;
  qualifiedApiName?: string;
  EditDefinitionUrl?: string;
}

// --------------------------
// OrgListView Component
// --------------------------
function OrgListView() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { isLoading: loadingOrgs, data, revalidate } = useExec("sf", ["org", "list", "--json"]);

  useEffect(() => {
    async function parseOrgs() {
      if (data) {
        try {
          const parsed = JSON.parse(data) as OrgListResult;
          const fetchedOrgs: Org[] = [];
          if (parsed.result?.nonScratchOrgs) {
            parsed.result.nonScratchOrgs.forEach((item: RawOrg) => {
              fetchedOrgs.push({
                username: item.username,
                alias: item.alias ?? "",
                orgId: item.orgId,
                instanceUrl: item.instanceUrl,
              });
            });
          }
          if (parsed.result?.scratchOrgs) {
            parsed.result.scratchOrgs.forEach((item: RawOrg) => {
              fetchedOrgs.push({
                username: item.username,
                alias: item.alias ?? "",
                orgId: item.orgId,
                instanceUrl: item.instanceUrl,
              });
            });
          }
          setOrgs(fetchedOrgs);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          await showToast({
            style: Toast.Style.Failure,
            title: "Error parsing orgs",
            message: errorMessage,
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
    parseOrgs();
  }, [data]);

  return (
    <List
      isLoading={isLoading || loadingOrgs}
      navigationTitle="Salesforce: Connected Orgs"
      actions={
        <ActionPanel>
          <Action title="Refresh Orgs" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      <List.Section title="Connected Orgs">
        {orgs.map((org) => (
          <List.Item
            key={org.username}
            title={org.alias || org.username}
            subtitle={org.instanceUrl}
            icon={Icon.Box}
            actions={
              <ActionPanel>
                <Action.Push title="Select Options" icon={Icon.ArrowRight} target={<SelectOptionsView org={org} />} />
                <Action
                  title="Copy Org Id"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    try {
                      const execPromise = promisify(exec);
                      const targetOrg = org.alias || org.username;
                      const { stdout } = await execPromise(`sf org display --target-org "${targetOrg}" --json`);
                      const parsed = JSON.parse(stdout);
                      const orgId = parsed.result.id;
                      await Clipboard.copy(orgId);
                      await showHUD(`Org ID Copied: ${orgId}`);
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to copy Org ID",
                        message: errorMessage,
                      });
                    }
                  }}
                />
                <Action title="Refresh Orgs" onAction={() => revalidate()} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// --------------------------
// Normalization Function for SObjects
// --------------------------
function parseSobjectsOutput(output: string): SObject[] {
  try {
    const parsed = JSON.parse(output);
    const rawRecords = parsed.result?.records || parsed.result || [];
    return rawRecords.map((r: RawSObject) => ({
      id: r.durableid || r.DurableId || "",
      label: r.Label || r.label || r.MasterLabel || r.QualifiedApiName || "",
      developername: r.DeveloperName || r.developername || r.QualifiedApiName || "",
      QualifiedApiName: r.QualifiedApiName || r.qualifiedApiName || "",
      EditDefinitionUrl: r.EditDefinitionUrl,
    }));
  } catch (err: unknown) {
    console.error("Failed to parse SObjects output:", err);
    return [];
  }
}

// --------------------------
// Open in SOQLX Action (New Feature)
// --------------------------
function OpenInSOQLXAction({ targetOrg }: { targetOrg: string }) {
  const openInSOQLX = useCallback(async () => {
    try {
      const SOQLX_BUNDLE_ID = "com.pocketsoap.osx.SoqlXplorer";
      const installedApps = await getApplications();
      const soqlxApp = installedApps.find((app) => app.bundleId === SOQLX_BUNDLE_ID);
      if (!soqlxApp) {
        await showToast({
          style: Toast.Style.Failure,
          title: "SoqlXplorer not installed",
          message: "Please install SoqlXplorer to use this feature.",
        });
        return;
      }

      const execPromise = promisify(exec);
      const { stdout } = await execPromise(`sf org display --target-org "${targetOrg}" --json`);
      const result = JSON.parse(stdout)?.result;
      if (!result) throw new Error("No org data found.");

      // Ensure the instanceUrl exists and extract the host name
      if (!result.instanceUrl) throw new Error("No instance URL found for org.");
      const urlObj = new URL(result.instanceUrl);
      const serverHost = urlObj.host;

      // We need a session ID for SoqlXplorer.
      // Assuming the CLI returns it as accessToken, adjust the property if needed.
      const sessionId = result.accessToken;
      if (!sessionId) throw new Error("No session ID found in org data.");

      // Construct the SoqlX URL with the required format.
      const soqlxUrl = `soqlx://${serverHost}/sid/${sessionId}`;

      // Open the URL so that SoqlXplorer launches with your session.
      await open(soqlxUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open in SOQLX",
        message: errorMessage,
      });
    }
  }, [targetOrg]);

  return <Action title="Open in Soqlx" icon={Icon.List} onAction={openInSOQLX} />;
}

// --------------------------
// Render SObject Row with Inline Actions
// --------------------------
function renderSobjectRow(org: Org, sobj: SObject, index: number): JSX.Element {
  const baseLabel = (sobj.label || sobj.developername || "Unknown SObject").trim();
  const keywords = [baseLabel.toLowerCase()];
  let settingsUrl = "";
  if (sobj.EditDefinitionUrl) {
    let base = sobj.EditDefinitionUrl;
    if (base.endsWith("/e")) {
      base = base.slice(0, base.length - 2);
    }
    settingsUrl = `${org.instanceUrl}/lightning/setup/ObjectManager/${base}/view`;
  } else {
    settingsUrl = `${org.instanceUrl}/lightning/setup/ObjectManager/${sobj.developername}/Details/view`;
  }
  const mainTabUrl = `${org.instanceUrl}/lightning/o/${sobj.QualifiedApiName}/list?filterName=__Recent`;
  const relativeSettingsPath = new URL(settingsUrl).pathname + new URL(settingsUrl).search;
  const relativeMainTabPath = new URL(mainTabUrl).pathname + new URL(mainTabUrl).search;
  const targetOrg = org.alias || org.username;

  return (
    <List.Item
      key={`${sobj.id}_${index}`}
      title={baseLabel}
      subtitle={sobj.QualifiedApiName}
      icon={Icon.AppWindowList}
      keywords={keywords}
      actions={
        <ActionPanel>
          <Action
            title="Open Object Settings"
            icon={Icon.Gear}
            onAction={async () => {
              try {
                const execPromise = promisify(exec);
                await execPromise(`sf org open -p "${relativeSettingsPath}" --target-org "${targetOrg}"`);
                await closeMainWindow();
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to Open Object Settings",
                  message: errorMessage,
                });
              }
            }}
          />
          <Action
            title="Open Object Tab"
            icon={Icon.Globe}
            onAction={async () => {
              try {
                const execPromise = promisify(exec);
                await execPromise(`sf org open -p "${relativeMainTabPath}" --target-org "${targetOrg}"`);
                await closeMainWindow();
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to Open Object Tab",
                  message: errorMessage,
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// --------------------------
// SelectOptionsView Component
// --------------------------
function SelectOptionsView({ org }: { org: Org }) {
  const targetOrg = org.alias || org.username;
  const [filterCategory, setFilterCategory] = useState("all");

  const filterAccessory = (
    <List.Dropdown
      tooltip="Filter Sections"
      onChange={(newValue) => setFilterCategory(newValue)}
      value={filterCategory}
    >
      <List.Dropdown.Section title="Show">
        <List.Dropdown.Item value="all" title="All" />
        <List.Dropdown.Item value="general" title="General" />
        <List.Dropdown.Item value="sobjects" title="SObjects" />
        <List.Dropdown.Item value="settings" title="Settings Pages" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const {
    isLoading: isLoadingSobjects,
    data: sobjectsOutput,
    error: sobjectsError,
  } = useExec("sf", [
    "data",
    "query",
    "--query",
    "SELECT Id, Label, QualifiedApiName, DeveloperName, EditDefinitionUrl FROM entitydefinition WHERE isQueryable = true AND isSearchable = true ORDER BY DeveloperName ASC",
    "--use-tooling-api",
    "--target-org",
    targetOrg,
    "--json",
  ]);
  const [sobjects, setSobjects] = useCachedState<SObject[]>(`sobjects-${targetOrg}`, []);
  useEffect(() => {
    if (sobjectsOutput) {
      const records = parseSobjectsOutput(sobjectsOutput);
      setSobjects(records);
    }
  }, [sobjectsOutput, setSobjects]);

  return (
    <List navigationTitle={`Salesforce: ${targetOrg}`} searchBarAccessory={filterAccessory}>
      {(filterCategory === "all" || filterCategory === "general") && (
        <List.Section title="General Options">
          <List.Item
            icon={Icon.Globe}
            title="Global Search"
            subtitle="Search Across All Objects"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Global Search Results"
                  icon={Icon.Globe}
                  target={<GlobalSearchResultsView org={org} />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Key}
            title="Open By ID"
            subtitle="Enter a Record ID"
            actions={
              <ActionPanel>
                <Action.Push title="Open by Id" icon={Icon.Key} target={<OpenIdView org={org} />} />
              </ActionPanel>
            }
          />
          <List.Item
            key="global-search-users"
            icon={Icon.Person}
            title="Users"
            subtitle="View Salesforce Users"
            actions={
              <ActionPanel>
                <Action.Push title="View Users" icon={Icon.ArrowRight} target={<SalesforceUsersView org={org} />} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.House}
            title="Home"
            subtitle="Open Org Home Page"
            actions={
              <ActionPanel>
                <Action
                  title="Open Home"
                  icon={Icon.House}
                  onAction={async () => {
                    try {
                      const execPromise = promisify(exec);
                      await execPromise(`sf org open -p "/" --target-org "${targetOrg}"`);
                      await closeMainWindow();
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to open Home Page",
                        message: errorMessage,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Code}
            title="Console"
            subtitle="Open Developer Console"
            actions={
              <ActionPanel>
                <Action
                  title="Open Console"
                  icon={Icon.Code}
                  onAction={async () => {
                    try {
                      const execPromise = promisify(exec);
                      await execPromise(
                        `sf org open -p "/_ui/common/apex/debug/ApexCSIPage" --target-org "${targetOrg}"`,
                      );
                      await closeMainWindow();
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to open Developer Console",
                        message: errorMessage,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.List}
            title="Open In SOQLX"
            subtitle="Launch SOQLX with Your Session"
            actions={
              <ActionPanel>
                <OpenInSOQLXAction targetOrg={targetOrg} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {(filterCategory === "all" || filterCategory === "settings") && (
        <List.Section title="Settings Pages">
          {PAGES.map((page: { title: string; value: string }) => (
            <List.Item
              key={page.title}
              title={page.title}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Globe}
                    title="Open Page"
                    onAction={async () => {
                      try {
                        const execPromise = promisify(exec);
                        await execPromise(`sf org open -p ${page.value} --target-org ${targetOrg}`);
                        await closeMainWindow();
                      } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to open page",
                          message: errorMessage,
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {(filterCategory === "all" || filterCategory === "sobjects") && (
        <List.Section title="SObjects">
          {isLoadingSobjects ? (
            <List.Item title="Loading SObjects…" icon={Icon.CircleProgress} />
          ) : sobjectsError ? (
            <List.Item title="Failed to load SObjects" icon={Icon.Warning} />
          ) : sobjects.length === 0 ? (
            <List.Item title="No SObjects found" icon={Icon.MagnifyingGlass} />
          ) : (
            sobjects.map((sobj, index) => renderSobjectRow(org, sobj, index))
          )}
        </List.Section>
      )}
    </List>
  );
}

// --------------------------
// Main Command Export
// --------------------------
export default function Command() {
  return <OrgListView />;
}
