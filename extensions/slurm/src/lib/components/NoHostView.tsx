import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";

export function NoHostView() {
  return (
    <List>
      <List.EmptyView
        title="No active clusters"
        description="Select one or more clusters first."
        icon={Icon.Plug}
        actions={
          <ActionPanel>
            <Action
              title="Open Select Clusters"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "select-cluster", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
