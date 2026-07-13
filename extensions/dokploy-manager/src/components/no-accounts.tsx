import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { AccountForm } from "./account-form";

interface NoAccountsProps {
  onAccountAdded: () => void;
}

/** Shown by every command when the user hasn't connected a Dokploy instance yet. */
export function NoAccounts({ onAccountAdded }: NoAccountsProps) {
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="No Dokploy Account Connected"
      description="Add your Dokploy server URL and an API key to get started."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Account"
            icon={Icon.Plus}
            target={<AccountForm onSaved={onAccountAdded} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    />
  );
}
