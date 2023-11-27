import { ActionPanel, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Select app type to install">
      <List.Item
        icon="nt-dev.png"
        title="Feature"
        actions={
          <ActionPanel>
            <Action
              title="View Branches"
              onAction={() => { }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="nt-logo.png"
        title="Main"
        actions={
          <ActionPanel>
            <Action
              title="View Branches"
              onAction={() => { }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="maestro.png"
        title="Maestro"
        actions={
          <ActionPanel>
            <Action
              title="View Branches"
              onAction={() => { }}
            />
          </ActionPanel>
        }
      />
    </List>
  )
}