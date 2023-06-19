import { List, Action, ActionPanel, getPreferenceValues } from '@raycast/api';
import { cloudflow } from 'quantumlib';

export default function Command() {
  const { cloudflowBaseUrl } = getPreferenceValues();
  const workspaces_sorted = cloudflow
    .getWorkspaces(cloudflowBaseUrl)
    .sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));

  return (
    <List searchBarPlaceholder="Select a workspace location to open in your default browser">
      {workspaces_sorted.map((workspace) => (
        <List.Item
          id={workspace.name}
          key={workspace.name}
          title={workspace.name}
          icon="../assets/quantumcast.png"
          accessories={[{ text: workspace.license }]}
          actions={
            <ActionPanel title="Quantumcast - Workspaces">
              <Action.OpenInBrowser url={`${workspace.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
