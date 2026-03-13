import { Action, ActionPanel, Alert, Icon, List, LocalStorage, confirmAlert } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        title="Reset TempMail Back to Defaults?"
        description="If you encounter errors, execute this command to reset the extension back to defaults"
        icon={{ source: Icon.RewindFilled }}
        actions={
          <ActionPanel>
            <Action
              title="Reset"
              onAction={() =>
                confirmAlert({
                  title: "Reset TempMail",
                  message: "All your current messages will be lost",
                  primaryAction: {
                    title: "Reset",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      await LocalStorage.clear();
                    },
                  },
                  dismissAction: {
                    title: "Cancel",
                    style: Alert.ActionStyle.Cancel,
                  },
                })
              }
            ></Action>
          </ActionPanel>
        }
      ></List.EmptyView>
    </List>
  );
}
