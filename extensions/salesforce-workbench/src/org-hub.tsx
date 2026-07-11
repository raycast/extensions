import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { SalesforceSetupAction } from "./components/SetupGuide";
import { useSalesforceOrgs } from "./hooks";
import { clearHistory } from "./storage";
import { loginOrg, openOrgPath } from "./salesforce";

export default function OrgHub() {
  const { orgs, activeOrg, isLoading, error, selectOrg, refresh } = useSalesforceOrgs();
  if (error) return <ErrorView title="Unable to load Salesforce orgs" error={error} onRetry={refresh} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search authenticated Salesforce orgs…">
      {orgs.map((org) => (
        <List.Item
          key={org.orgId}
          icon={{ source: Icon.CircleFilled, tintColor: org.isSandbox ? Color.Blue : Color.Red }}
          title={org.alias}
          subtitle={`${org.isSandbox ? "Sandbox" : "PRODUCTION"} · ${org.username}`}
          keywords={[org.username, org.instanceUrl, ...org.aliases]}
          accessories={[
            {
              text: org.orgId === activeOrg?.orgId ? "Active" : undefined,
              icon: org.orgId === activeOrg?.orgId ? Icon.Checkmark : undefined,
            },
            {
              tag: {
                value: org.connectedStatus,
                color: org.connectedStatus === "Connected" ? Color.Green : Color.Orange,
              },
            },
            { text: `API ${org.instanceApiVersion}` },
          ]}
          detail={
            <List.Item.Detail
              markdown={`# ${org.alias}\n\n${org.isSandbox ? "Sandbox" : "**PRODUCTION**"}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Username" text={org.username} />
                  <List.Item.Detail.Metadata.Label title="Org ID" text={org.orgId} />
                  <List.Item.Detail.Metadata.Label title="Instance" text={org.instanceUrl} />
                  <List.Item.Detail.Metadata.Label title="API Version" text={org.instanceApiVersion} />
                  <List.Item.Detail.Metadata.Label title="Status" text={org.connectedStatus} />
                  <List.Item.Detail.Metadata.Label title="Aliases" text={org.aliases.join(", ") || "None"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Set as Active Org"
                icon={Icon.Checkmark}
                onAction={async () => {
                  await selectOrg(org.orgId);
                  await showToast({ style: Toast.Style.Success, title: `Active org: ${org.alias}` });
                }}
              />
              <Action title="Open Salesforce Home" icon={Icon.Globe} onAction={() => openOrgPath(org)} />
              <Action
                title="Open Setup"
                icon={Icon.Gear}
                onAction={() => openOrgPath(org, "/lightning/setup/SetupOneHome/home")}
              />
              <Action.Push
                title="Reauthenticate Org"
                icon={Icon.Key}
                target={<LoginForm initialUrl={org.instanceUrl} initialAlias={org.alias} onComplete={refresh} />}
              />
              <Action.Push title="Add Salesforce Org" icon={Icon.Plus} target={<LoginForm onComplete={refresh} />} />
              <Action title="Refresh Org Status" icon={Icon.ArrowClockwise} onAction={refresh} />
              <SalesforceSetupAction />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Clear Query History"
                icon={Icon.Trash}
                onAction={async () => {
                  await clearHistory("query");
                  await showToast({ style: Toast.Style.Success, title: "Query history cleared" });
                }}
              />
              <Action
                title="Clear Mutation History"
                icon={Icon.Trash}
                onAction={async () => {
                  await clearHistory("mutation");
                  await showToast({ style: Toast.Style.Success, title: "Mutation history cleared" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !orgs.length ? (
        <List.EmptyView
          title="No authenticated Salesforce orgs"
          description="Add an org with Salesforce CLI web login."
          actions={
            <ActionPanel>
              <Action.Push title="Add Salesforce Org" icon={Icon.Plus} target={<LoginForm onComplete={refresh} />} />
              <SalesforceSetupAction />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function LoginForm({
  initialUrl = "https://login.salesforce.com",
  initialAlias = "",
  onComplete,
}: {
  initialUrl?: string;
  initialAlias?: string;
  onComplete: () => Promise<void>;
}) {
  const [environment, setEnvironment] = useState<"production" | "sandbox" | "custom">(
    initialUrl.includes("sandbox") || initialUrl.includes("test.salesforce.com") ? "sandbox" : "production",
  );
  const [instanceUrl, setInstanceUrl] = useState(initialUrl);
  const [alias, setAlias] = useState(initialAlias);
  const [isLoading, setLoading] = useState(false);

  const changeEnvironment = (next: string) => {
    const typed = next as "production" | "sandbox" | "custom";
    setEnvironment(typed);
    if (typed === "production") setInstanceUrl("https://login.salesforce.com");
    if (typed === "sandbox") setInstanceUrl("https://test.salesforce.com");
    if (typed === "custom") setInstanceUrl("");
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Authenticate Salesforce Org"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Salesforce Login"
            icon={Icon.Key}
            onSubmit={async () => {
              if (!instanceUrl.startsWith("https://") || !alias.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Enter an HTTPS login URL and alias" });
                return;
              }
              setLoading(true);
              try {
                await loginOrg(instanceUrl, alias.trim());
                await onComplete();
                await showToast({ style: Toast.Style.Success, title: `Authenticated ${alias.trim()}` });
              } catch (caught) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Salesforce login failed",
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
      <Form.Dropdown id="environment" title="Environment" value={environment} onChange={changeEnvironment}>
        <Form.Dropdown.Item value="production" title="Production" />
        <Form.Dropdown.Item value="sandbox" title="Sandbox" />
        <Form.Dropdown.Item value="custom" title="Custom My Domain" />
      </Form.Dropdown>
      <Form.TextField
        id="instanceUrl"
        title="Login URL"
        placeholder="https://ijm--sandbox.sandbox.my.salesforce.com"
        value={instanceUrl}
        onChange={setInstanceUrl}
      />
      <Form.TextField id="alias" title="Alias" placeholder="Example Sandbox" value={alias} onChange={setAlias} />
    </Form>
  );
}
