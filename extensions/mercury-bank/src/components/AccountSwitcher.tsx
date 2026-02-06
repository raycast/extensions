import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useActiveAccount } from "../lib/hooks/useActiveAccount";

export function AccountSwitcherActions() {
  const { activeAccount, storedAccounts, switchAccount } = useActiveAccount();

  if (storedAccounts.length <= 1) return null;

  return (
    <ActionPanel.Submenu
      title="Switch Account"
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    >
      {storedAccounts.map((account) => (
        <Action
          key={account.id}
          title={account.name}
          icon={
            account.id === activeAccount?.id
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : Icon.Circle
          }
          onAction={() => switchAccount(account)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}