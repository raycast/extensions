import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { deleteAccount, setActiveAccountId } from "./accounts/storage";
import { DokployAccount } from "./accounts/types";
import { AccountForm } from "./components/account-form";
import { useAccounts } from "./hooks/use-accounts";
import { projectsUrl } from "./lib/urls";

export default function ManageAccounts() {
  const { accounts, activeAccount, isLoading, reloadAccounts } = useAccounts();

  async function makeActive(account: DokployAccount) {
    await setActiveAccountId(account.id);
    reloadAccounts();
    await showToast({ style: Toast.Style.Success, title: "Switched Account", message: account.label });
  }

  async function remove(account: DokployAccount) {
    const confirmed = await confirmAlert({
      title: `Remove ${account.label}?`,
      message: "This only removes the account from Raycast. Your Dokploy server is left untouched.",
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteAccount(account.id);
    reloadAccounts();
    await showToast({ style: Toast.Style.Success, title: "Account Removed", message: account.label });
  }

  const addAction = (
    <Action.Push
      title="Add Account"
      icon={Icon.Plus}
      target={<AccountForm onSaved={reloadAccounts} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts…">
      <List.EmptyView
        icon={Icon.Plug}
        title="No Dokploy Account Connected"
        description="Add your Dokploy server URL and an API key to get started."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />

      {accounts.map((account) => {
        const isActive = account.id === activeAccount?.id;

        return (
          <List.Item
            key={account.id}
            icon={{ source: Icon.Building, tintColor: isActive ? Color.Green : Color.SecondaryText }}
            title={account.label}
            subtitle={account.url}
            accessories={isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {!isActive && <Action title="Set as Active" icon={Icon.Check} onAction={() => makeActive(account)} />}
                  <Action.Push
                    title="Edit Account"
                    icon={Icon.Pencil}
                    target={<AccountForm account={account} onSaved={reloadAccounts} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action.OpenInBrowser
                    title="Open Dashboard"
                    url={projectsUrl(account.url)}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {addAction}
                  <Action
                    title="Remove Account"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(account)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
