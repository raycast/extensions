import { List, ActionPanel, Action, Icon } from "@raycast/api";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search your projects...">
      <List.Item
        title="Example Project"
        subtitle="~/Documents/code/example"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action title="Open in VS Code" onAction={() => console.log("Open project")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
