import { Action, ActionPanel, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";

export function ManageInstanceEmptyView() {
  return (
    <List.EmptyView
      title="No Instances Found"
      description="Add a Bugzilla instance using `Manage Bugzilla Instances` command"
      icon="no-view.png"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              onAction={async () => {
                try {
                  launchCommand({ name: "manage-instances", type: LaunchType.UserInitiated });
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Error",
                    message: "Couldn't launch manage instances, did you disable it?",
                  });
                }
              }}
              title="Manage Instances"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
