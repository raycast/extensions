import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";

export default function NoAccountsList() {
  return (
    <List>
      <List.EmptyView
        title="You don't have a Linkding Account"
        description="Please create a linkding account before continuing."
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowRight}
              title="Go to Manage Account"
              onAction={() => launchCommand({ name: "manage-account", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
