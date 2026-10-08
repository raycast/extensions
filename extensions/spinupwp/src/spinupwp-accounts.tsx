import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getActiveAccountId,
  setActiveAccountId,
} from "./accounts";
import { Account } from "./types";

function AddAccountForm({ onAccountAdded }: { onAccountAdded: () => void }) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string; token: string }) => {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (!values.token.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Token is required",
      });
      return;
    }

    try {
      await addAccount(values.name, values.token);
      await showToast({
        style: Toast.Style.Success,
        title: "Account added",
        message: values.name,
      });
      onAccountAdded();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Account" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        placeholder="My SpinupWP Account"
        info="A friendly name to identify this account"
      />
      <Form.PasswordField
        id="token"
        title="API Token"
        placeholder="Enter your SpinupWP API token"
        info="Generate a token from your SpinupWP account settings"
      />
    </Form>
  );
}

function EditAccountForm({ account, onAccountUpdated }: { account: Account; onAccountUpdated: () => void }) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string; token: string }) => {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (!values.token.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Token is required",
      });
      return;
    }

    try {
      await updateAccount(account.id, values.name, values.token);
      await showToast({
        style: Toast.Style.Success,
        title: "Account updated",
        message: values.name,
      });
      onAccountUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        defaultValue={account.name}
        placeholder="My SpinupWP Account"
        info="A friendly name to identify this account"
      />
      <Form.PasswordField
        id="token"
        title="API Token"
        defaultValue={account.token}
        placeholder="Enter your SpinupWP API token"
        info="Generate a token from your SpinupWP account settings"
      />
    </Form>
  );
}

function AccountActions({
  account,
  isActive,
  onSetActive,
  onDelete,
  onAccountUpdated,
}: {
  account: Account;
  isActive: boolean;
  onSetActive: () => void;
  onDelete: () => void;
  onAccountUpdated: () => void;
}) {
  return (
    <ActionPanel>
      {!isActive && (
        <Action
          title="Set as Active"
          icon={Icon.CheckCircle}
          onAction={onSetActive}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
      )}
      <Action.Push
        title="Edit Account"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditAccountForm account={account} onAccountUpdated={onAccountUpdated} />}
      />
      <Action
        title="Delete Account"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: "Delete Account",
            message: `Are you sure you want to delete "${account.name}"?`,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          });

          if (confirmed) {
            onDelete();
          }
        }}
      />
      <Action.OpenInBrowser
        title="Open SpinupWP Settings"
        url="https://spinupwp.app/settings"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const { data: accounts, isLoading, revalidate } = usePromise(getAccounts);

  const { data: activeAccountId, revalidate: revalidateActive } = usePromise(getActiveAccountId);

  const handleSetActive = async (accountId: string) => {
    await setActiveAccountId(accountId);
    await showToast({
      style: Toast.Style.Success,
      title: "Account activated",
    });
    revalidateActive();
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    try {
      await deleteAccount(accountId);
      await showToast({
        style: Toast.Style.Success,
        title: "Account deleted",
        message: accountName,
      });
      revalidate();
      revalidateActive();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleAccountAdded = () => {
    revalidate();
    revalidateActive();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search accounts..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Account"
            icon={Icon.Plus}
            target={<AddAccountForm onAccountAdded={handleAccountAdded} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No accounts configured"
        description="Add a SpinupWP account to get started"
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Account"
              icon={Icon.Plus}
              target={<AddAccountForm onAccountAdded={handleAccountAdded} />}
            />
            <Action.OpenInBrowser title="Open SpinupWP Settings" url="https://spinupwp.app/settings" />
          </ActionPanel>
        }
      />
      {accounts?.map((account) => {
        const isActive = account.id === activeAccountId;
        return (
          <List.Item
            key={account.id}
            title={account.name}
            subtitle={isActive ? "Active" : undefined}
            icon={Icon.Person}
            accessories={
              isActive
                ? [
                    {
                      tag: { value: "Active", color: Color.Green },
                    },
                  ]
                : []
            }
            actions={
              <AccountActions
                account={account}
                isActive={isActive}
                onSetActive={() => handleSetActive(account.id)}
                onDelete={() => handleDelete(account.id, account.name)}
                onAccountUpdated={handleAccountAdded}
              />
            }
          />
        );
      })}
      {accounts && accounts.length > 0 && (
        <List.Section title="Actions">
          <List.Item
            title="Add New Account"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Account"
                  icon={Icon.Plus}
                  target={<AddAccountForm onAccountAdded={handleAccountAdded} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
