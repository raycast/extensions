import { Action, ActionPanel, Icon, List, launchCommand, LaunchType } from "@raycast/api";

export function NoScheduleEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Calendar}
      title="No Schedule Found"
      description="Create a schedule group and add courses to get started."
      actions={
        <ActionPanel>
          <Action
            title="Manage Schedules"
            icon={Icon.Gear}
            onAction={() => launchCommand({ name: "manage-schedules", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
