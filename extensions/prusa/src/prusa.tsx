import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        icon={Icon.Bird}
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
