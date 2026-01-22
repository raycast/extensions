import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

const SIERRA_WORKSPACES = {
  marsha: {
    production: "https://marshmallow.sierra.ai/agents/01K0PR9DPME10Q3BWSSKPJHD84/sessions/01KDT834KHY2WTNPS7H8XZHVKW",
    staging: "https://marshmallow.sierra.ai/agents/01K0PR7FC4KHYNC1QAPW0T0DQ4/sessions",
  },
  "marsha-rr": {
    production: "https://marshmallow.sierra.ai/agents/01JPT8JDZFP42W7CAGG6WQKTJC/sessions",
    staging: "https://marshmallow.sierra.ai/agents/01JEY0BZMBD2D7ZJQD4C2428B8/sessions",
  },
};

const INTERCOM_WORKSPACES = {
  production: "segl9g2z",
  staging: "jh4vt8fe",
};

type Workspace = keyof typeof SIERRA_WORKSPACES;
type Environment = keyof typeof INTERCOM_WORKSPACES;
type Selection = `${Workspace}-${Environment}`;

const parseSelection = (selection: Selection): { workspace: Workspace; environment: Environment } => {
  const [workspace, environment] = selection.split(/-(?=production|staging)/) as [Workspace, Environment];
  return { workspace, environment };
};

const getIntercomUrl = (environment: Environment, intercomId: string) =>
  `https://app.intercom.com/a/inbox/${INTERCOM_WORKSPACES[environment]}/inbox/conversation/${intercomId}?view=List`;

const getSierraUrl = (workspace: Workspace, environment: Environment, intercomId: string) =>
  `${SIERRA_WORKSPACES[workspace][environment]}?search=${intercomId}`;

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [selection, setSelection] = useState<Selection>("marsha-production");

  const { workspace, environment } = parseSelection(selection);

  return (
    <List
      searchBarPlaceholder="Enter Intercom ID"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Workspace & Environment"
          value={selection}
          onChange={(val) => setSelection(val as Selection)}
        >
          <List.Dropdown.Section title="Marsha">
            <List.Dropdown.Item value="marsha-production" title="Production" />
            <List.Dropdown.Item value="marsha-staging" title="Staging" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Marsha RR">
            <List.Dropdown.Item value="marsha-rr-production" title="Production" />
            <List.Dropdown.Item value="marsha-rr-staging" title="Staging" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Item
        title="Open in Intercom"
        subtitle={searchText ? `Conversation ${searchText}` : "Enter an Intercom ID"}
        icon={Icon.Message}
        actions={
          searchText && (
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Intercom" url={getIntercomUrl(environment, searchText)} />
            </ActionPanel>
          )
        }
      />
      <List.Item
        title="Open in Sierra"
        subtitle={searchText ? `Search for ${searchText}` : "Enter an Intercom ID"}
        icon={Icon.MagnifyingGlass}
        actions={
          searchText && (
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Sierra" url={getSierraUrl(workspace, environment, searchText)} />
            </ActionPanel>
          )
        }
      />
    </List>
  );
}
