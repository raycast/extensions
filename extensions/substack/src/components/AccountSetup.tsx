import { Action, ActionPanel, Detail, Keyboard, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";

import ManageAccounts from "@/manage-accounts";

export default function AccountSetup({ message, onRefresh }: { message: string; onRefresh: () => void }) {
  return (
    <Detail
      markdown={message}
      actions={
        <ActionPanel>
          <Action.Push title="Manage Accounts" target={<ManageAccounts />} onPop={onRefresh} />
          <Action
            title="Import Legacy Preferences"
            onAction={async () => {
              try {
                await launchCommand({ name: "create-substack-draft", type: LaunchType.UserInitiated });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open Create Draft",
                  message: "Try opening Create Draft from Raycast.",
                });
              }
            }}
          />
          <Action shortcut={Keyboard.Shortcut.Common.Refresh} title="Refresh Accounts" onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
