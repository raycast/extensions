import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DynamicRecordForm } from "./components/DynamicRecordForm";
import { ErrorView } from "./components/ErrorView";
import { OrgListDropdown } from "./components/OrgDropdown";
import { useSalesforceOrgs } from "./hooks";
import { getSearchObjects } from "./preferences";

export default function CreateRecord() {
  const { orgs, activeOrg, isLoading, error, selectOrg, refresh } = useSalesforceOrgs();
  const objects = getSearchObjects();
  if (error) return <ErrorView title="Unable to load Salesforce orgs" error={error} onRetry={refresh} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Choose an object to create…"
      searchBarAccessory={
        <OrgListDropdown orgs={orgs} value={activeOrg?.orgId} onChange={(orgId) => void selectOrg(orgId)} />
      }
    >
      <List.Section
        title={activeOrg?.isSandbox ? `Sandbox: ${activeOrg.alias}` : `PRODUCTION: ${activeOrg?.alias ?? ""}`}
      >
        {objects.map((object) => (
          <List.Item
            key={object.apiName}
            icon={{ source: Icon.PlusCircle, tintColor: activeOrg?.isSandbox ? Color.Blue : Color.Red }}
            title={object.apiName}
            subtitle={`Create ${object.apiName} record`}
            actions={
              activeOrg ? (
                <ActionPanel>
                  <Action.Push
                    title={`Create ${object.apiName}`}
                    icon={Icon.Plus}
                    target={<DynamicRecordForm org={activeOrg} objectApiName={object.apiName} mode="create" />}
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
