import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { OrgListDropdown } from "./components/OrgDropdown";
import { useSalesforceOrgs } from "./hooks";
import { openOrgPath, openRecord, resolveRecordObjectNames, validateRecordId } from "./salesforce";
import { SalesforceOrg } from "./types";

const DESTINATIONS = [
  { title: "Salesforce Home", path: "/lightning/page/home", icon: Icon.House },
  { title: "Setup Home", path: "/lightning/setup/SetupOneHome/home", icon: Icon.Gear },
  { title: "Object Manager", path: "/lightning/setup/ObjectManager/home", icon: Icon.List },
  { title: "Users", path: "/lightning/setup/ManageUsers/home", icon: Icon.Person },
  { title: "Permission Sets", path: "/lightning/setup/PermSets/home", icon: Icon.Lock },
  { title: "Flows", path: "/lightning/setup/Flows/home", icon: Icon.ArrowRight },
  { title: "Apex Classes", path: "/lightning/setup/ApexClasses/home", icon: Icon.Code },
  { title: "Debug Logs", path: "/lightning/setup/ApexDebugLogs/home", icon: Icon.Bug },
  { title: "Scheduled Jobs", path: "/lightning/setup/ScheduledJobs/home", icon: Icon.Clock },
  { title: "Setup Audit Trail", path: "/lightning/setup/SetupAuditTrail/home", icon: Icon.Fingerprint },
] as const;

export default function OpenSalesforce() {
  const { orgs, activeOrg, isLoading, error, selectOrg, refresh } = useSalesforceOrgs();
  if (error) return <ErrorView title="Unable to load Salesforce orgs" error={error} onRetry={refresh} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Salesforce destinations…"
      searchBarAccessory={
        <OrgListDropdown orgs={orgs} value={activeOrg?.orgId} onChange={(orgId) => void selectOrg(orgId)} />
      }
    >
      {activeOrg ? (
        <List.Item
          icon={{ source: Icon.Link, tintColor: activeOrg.isSandbox ? Color.Blue : Color.Red }}
          title="Open Record by ID"
          subtitle="Paste a 15- or 18-character Salesforce record ID"
          actions={
            <ActionPanel>
              <Action.Push title="Open Record by ID" icon={Icon.Link} target={<RecordIdForm org={activeOrg} />} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section
        title={activeOrg?.isSandbox ? `Sandbox: ${activeOrg.alias}` : `PRODUCTION: ${activeOrg?.alias ?? ""}`}
      >
        {DESTINATIONS.map((destination) => (
          <List.Item
            key={destination.path}
            icon={destination.icon}
            title={destination.title}
            subtitle={destination.path}
            actions={
              activeOrg ? (
                <ActionPanel>
                  <Action
                    title={`Open ${destination.title}`}
                    icon={Icon.Globe}
                    onAction={() => openOrgPath(activeOrg, destination.path)}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function RecordIdForm({ org }: { org: SalesforceOrg }) {
  const [recordId, setRecordId] = useState("");
  const [isLoading, setLoading] = useState(false);
  const { push } = useNavigation();
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Resolve and Open Record"
            icon={Icon.Globe}
            onSubmit={async () => {
              try {
                validateRecordId(recordId.trim());
                setLoading(true);
                const objectNames = await resolveRecordObjectNames(org, recordId.trim());
                if (objectNames.length === 1) {
                  await openRecord(org, objectNames[0], recordId.trim());
                } else if (objectNames.length > 1) {
                  push(<ObjectChoice org={org} recordId={recordId.trim()} objectNames={objectNames} />);
                } else {
                  await showToast({ style: Toast.Style.Failure, title: "Could not resolve record type" });
                }
              } catch (caught) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unable to open record",
                  message: caught instanceof Error ? caught.message : String(caught),
                });
              } finally {
                setLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={org.isSandbox ? `Sandbox: ${org.alias}` : `PRODUCTION: ${org.alias}`}
        text={org.username}
      />
      <Form.TextField id="recordId" title="Record ID" value={recordId} onChange={setRecordId} />
    </Form>
  );
}

function ObjectChoice({ org, recordId, objectNames }: { org: SalesforceOrg; recordId: string; objectNames: string[] }) {
  return (
    <List navigationTitle="Choose Record Type">
      {objectNames.map((objectName) => (
        <List.Item
          key={objectName}
          title={objectName}
          subtitle={recordId}
          actions={
            <ActionPanel>
              <Action
                title={`Open ${objectName}`}
                icon={Icon.Globe}
                onAction={() => openRecord(org, objectName, recordId)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
