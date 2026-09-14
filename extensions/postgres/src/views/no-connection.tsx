import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";

/** Shown by every command when nothing is configured yet, with the one action that fixes it. */
export function NoConnection() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Plug}
        title="No PostgreSQL connection"
        description="Add a connection profile to run queries and let Raycast AI answer questions about your data."
        actions={
          <ActionPanel>
            <Action
              title="Manage Connections"
              icon={Icon.Gear}
              onAction={() => launchCommand({ name: "manage-connections", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
