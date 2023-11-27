
import { ActionPanel, Detail, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List isLoading={true} >
      <List.Item
        icon="nt-dev.png"
        title="Feature"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# List of Feature builds here" />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="nt-logo.png"
        title="Main"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# List of Main builds here" />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="maestro.png"
        title="Maestro"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# List of Maestro builds here" />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="Settings"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Set github token here" />} />
          </ActionPanel>
        }
      />
    </List>
  );
}