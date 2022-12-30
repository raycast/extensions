import { List, Action, ActionPanel } from "@raycast/api";
import { docUrlGoToWorkspace } from "./assets/globals";
import workspaces from "./assets/workspaces";

export default function Command() {
  const workspaces_sorted = workspaces.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });

  return (
    <List
      navigationTitle="Go to Workspace"
      searchBarPlaceholder="Select the workspace location to open in your default browser"
      isLoading={true}
    >
      {workspaces_sorted.map((workspace) => (
        <List.Item
          id={workspace.name}
          key={workspace.name}
          title={workspace.name.charAt(0).toUpperCase() + workspace.name.slice(1)}
          icon="../assets/quantumcast-extension-icon.png"
          actions={
            <ActionPanel title="Quantumcast - Workspaces">
              <Action.OpenInBrowser url={`${workspace.url}`} />
              <Action.OpenInBrowser title="Open Documentation" url={docUrlGoToWorkspace} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
