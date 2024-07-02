import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { Workspace, useSearchWorkspace } from "./hooks/use-search-workspace";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: workspaces, isLoading } = useSearchWorkspace(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search workspace which begins with :name or Get it by full :id (UUID)"
      throttle
      isShowingDetail={!isLoading}
    >
      <List.Section title="Workspaces" subtitle={workspaces?.length + ""}>
        {workspaces?.filter((x) => !!x).map((workspace) => <SearchListItem key={workspace.id} workspace={workspace} />)}
      </List.Section>
    </List>
  );
}

const buildDashboardUrl = (workspaceName: string) => `https://${workspaceName}.usedrop.io`;
const displayProperties = (object: Record<string, unknown>) => {
  if (!object || typeof object !== "object") return "";
  return Object.entries(object)
    .map(([key, value]) => `- **${key}**: ${JSON.stringify(value)}`)
    .join("\n");
};

function SearchListItem({ workspace }: { workspace: Workspace }) {
  const markdown = `# [${workspace.name}](${buildDashboardUrl(workspace.name)})

  \`${workspace.id}\`

  ### [Instagram](https://instagram.com/${workspace.integrations.instagram.accountName})
  
  ${displayProperties(workspace.integrations.instagram)}
  
  ### Chargebee
  
  - **plan**: ${workspace.chargebee.plan}
  - **mrr**: ${workspace.chargebee.workspaceMrr}`;

  return (
    <List.Item
      title={workspace.name}
      subtitle={workspace.id}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Dashboard" url={buildDashboardUrl(workspace.name)} />
            <Action.CopyToClipboard
              title="Copy Workspace ID"
              content={workspace.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
