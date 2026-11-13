import { Action, ActionPanel, Icon, List } from "@raycast/api";

export function HistoryPermissionView({ message }: { message: string }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="Raycast needs access to your Dia history"
        description={message}
        actions={
          <ActionPanel>
            <Action.Open
              title="Open System Settings"
              target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
