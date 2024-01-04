import { ActionPanel, Detail, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        icon="list-icon.png"
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Parrot UI" url="https://cockpit.ag5.com/realm/realm-europe-prod/tasks/parrot/list" />
          </ActionPanel>
        }
      />
    </List>
  );
}
