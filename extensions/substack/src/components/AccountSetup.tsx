import { Action, ActionPanel, Detail, Keyboard, LaunchType, launchCommand } from "@raycast/api";

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
            onAction={() => launchCommand({ name: "create-substack-draft", type: LaunchType.UserInitiated })}
          />
          <Action shortcut={Keyboard.Shortcut.Common.Refresh} title="Refresh Accounts" onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
