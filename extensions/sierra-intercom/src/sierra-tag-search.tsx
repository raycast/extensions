import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

const SIERRA_WORKSPACES = {
  marsha: {
    production: "https://marshmallow.sierra.ai/agents/01K0PR9DPME10Q3BWSSKPJHD84/sessions",
    staging: "https://marshmallow.sierra.ai/agents/01K0PR7FC4KHYNC1QAPW0T0DQ4/sessions",
  },
  "marsha-rr": {
    production: "https://marshmallow.sierra.ai/agents/01JPT8JDZFP42W7CAGG6WQKTJC/sessions",
    staging: "https://marshmallow.sierra.ai/agents/01JEY0BZMBD2D7ZJQD4C2428B8/sessions",
  },
};

type Workspace = keyof typeof SIERRA_WORKSPACES;
type Environment = "production" | "staging";
type Selection = `${Workspace}-${Environment}`;

const parseSelection = (selection: Selection): { workspace: Workspace; environment: Environment } => {
  const [workspace, environment] = selection.split(/-(?=production|staging)/) as [Workspace, Environment];
  return { workspace, environment };
};

const getSierraTagUrl = (workspace: Workspace, environment: Environment, tag: string) => {
  const baseUrl = SIERRA_WORKSPACES[workspace][environment];
  const encodedTag = encodeURIComponent(tag);
  return `${baseUrl}?tags=${encodedTag}`;
};

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [selection, setSelection] = useState<Selection>("marsha-production");

  const { workspace, environment } = parseSelection(selection);

  return (
    <List
      searchBarPlaceholder="Enter tag (e.g. ^knowledge:answer-kb-with-results)"
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
        title="Search Sierra by Tag"
        subtitle={searchText ? `Tag: ${searchText}` : "Enter a tag name"}
        icon={Icon.Tag}
        actions={
          searchText && (
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search Sierra by Tag"
                url={getSierraTagUrl(workspace, environment, searchText)}
              />
            </ActionPanel>
          )
        }
      />
    </List>
  );
}
