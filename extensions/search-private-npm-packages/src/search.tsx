import { useAccounts } from "@hooks/useAccounts";
import { ActionPanel, List, Action, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import PackageList from "@components/PackageList";
import { buildStr } from "@utils/str-utils";
import { Common } from "@data/common";
import AddTracking from "@root/add";

export default function Command() {
  const { accounts, removeAccount, clearAccounts, isLoading } = useAccounts();

  const onRemoveAccount = async (accountName: string) => {
    if (
      (await confirmAlert({
        title: "Remove Account?",
        message: `Are you sure you want to remove @${accountName}?`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })) === false
    ) {
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing Account..." });
    try {
      await removeAccount(accountName);
    } catch {
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Account Removed";
  };

  const onRemoveAllAccounts = async () => {
    if (
      (await confirmAlert({
        title: "Remove All Accounts?",
        message: "Are you sure you want to remove all accounts?",
        primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
      })) === false
    ) {
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing All Accounts..." });
    try {
      await clearAccounts();
    } catch {
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "All Accounts Removed";
  };

  return (
    <List isLoading={isLoading}>
      {accounts.map((account) => (
        <List.Item
          key={account.name}
          icon="list-icon.png"
          title={`@${account.name}`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.MagnifyingGlass}
                title="Search Packages"
                target={<PackageList accountName={account.name} />}
              />
              <Action.OpenInBrowser
                title="Open Homepage"
                url={buildStr(Common.URL.PackagesHomepage, { org: account.name })}
              />
              <Action.CopyToClipboard
                title="Copy Account Name"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={`@${account.name}`}
              />
              <Action.Push
                icon={Icon.PlusSquare}
                title="Add Tracking Account"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AddTracking />}
              />
              <Action
                icon={Icon.XMarkCircle}
                title="Remove Tracking Account"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => {
                  onRemoveAccount(account.name);
                }}
              />
              <Action
                icon={Icon.XMarkCircle}
                title="Remove All Tracking Account"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={onRemoveAllAccounts}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No Tracking Accounts Found"
        description="Press ↵ key to add a tracking account!"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.PlusSquare} title="Add Tracking Account" target={<AddTracking />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
