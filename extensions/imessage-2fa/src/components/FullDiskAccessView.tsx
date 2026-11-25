import { Action, ActionPanel, Icon, List } from "@raycast/api";

/**
 * Asks for Full Disk Access, like the permission screen of `useSQL` from `@raycast/utils`
 */
export function FullDiskAccessView(): JSX.Element {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="Raycast needs full disk access."
        description={
          "This is required to read 2FA codes from iMessage.\nYou can revert this access in System Settings whenever you want."
        }
        actions={
          <ActionPanel>
            <Action.Open
              title="Open System Settings -> Privacy"
              target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
