import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";

export function NoInstances() {
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="No Targetprocess Instance Yet"
      description="Add one in Manage Instances. You will need a personal access token from your Targetprocess profile settings."
      actions={
        <ActionPanel>
          <Action
            title="Open Manage Instances"
            icon={Icon.Gear}
            onAction={() => launchCommand({ name: "manage-instances", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
