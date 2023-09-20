import { ActionPanel, Detail, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
