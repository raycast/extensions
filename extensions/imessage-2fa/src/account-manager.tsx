import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getAccounts, addAccount, removeAccount, renameAccount, Account } from "./storage";
import { verifyAccountAuth, authorizeAccount, AccountAuthStatus } from "./gmail";
import { OAuthErrorView } from "./components/OAuthErrorView";
import { Preferences } from "./types";

function describeAuthStatus(status: AccountAuthStatus): {
  label: string;
  tooltip: string;
  color: Color;
  statusIcon: Icon;
} {
  switch (status) {
    case "authorized":
      return { label: "Authorized", tooltip: "Authorized", color: Color.Green, statusIcon: Icon.CheckCircle };
    case "expired":
      return {
        label: "Authorization Expired",
        tooltip: "Refresh token rejected — re-authorize this account",
        color: Color.Orange,
        statusIcon: Icon.ExclamationMark,
      };
    case "unauthorized":
    default:
      return { label: "Not Authorized", tooltip: "Not Authorized", color: Color.Red, statusIcon: Icon.XMarkCircle };
  }
}

export default function ManageGoogleAccounts() {
  const preferences = getPreferenceValues<Preferences>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [authStatuses, setAuthStatuses] = useState<Map<string, AccountAuthStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    const loadedAccounts = await getAccounts();
    setAccounts(loadedAccounts);

    const statuses = new Map<string, AccountAuthStatus>();
    for (const account of loadedAccounts) {
      const status = await verifyAccountAuth(account.id, account.name);
      statuses.set(account.id, status);
    }
    setAuthStatuses(statuses);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Guard runs AFTER all hooks so hook order stays stable across renders
  // (React Rules of Hooks).
  if (!preferences.gmailClientId || preferences.gmailClientId.trim() === "") {
    return <OAuthErrorView />;
  }

  const handleAddAccount = async (name: string) => {
    try {
      await addAccount(name);
      await showToast({
        style: Toast.Style.Success,
        title: "Account Added",
        message: `Added ${name}. You can now authorize it.`,
      });
      await loadAccounts();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRemoveAccount = async (account: Account) => {
    const confirmed = await confirmAlert({
      title: "Remove Account",
      message: `Are you sure you want to remove "${account.name}"? This will delete all stored tokens for this account.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await removeAccount(account.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Account Removed",
          message: `Removed ${account.name}`,
        });
        await loadAccounts();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Remove Account",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleRenameAccount = async (account: Account, newName: string) => {
    try {
      await renameAccount(account.id, newName);
      await showToast({
        style: Toast.Style.Success,
        title: "Account Renamed",
        message: `Renamed to ${newName}`,
      });
      await loadAccounts();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Rename Account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleAuthorizeAccount = async (account: Account) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Authorizing",
        message: `Opening browser for ${account.name}...`,
      });
      await authorizeAccount(account.id, account.name);
      await showToast({
        style: Toast.Style.Success,
        title: "Authorization Complete",
        message: `${account.name} is now authorized`,
      });
      await loadAccounts();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authorization Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts...">
      <List.Section title="Google Accounts">
        {accounts.map((account) => {
          const status = authStatuses.get(account.id) ?? "unauthorized";
          const presentation = describeAuthStatus(status);
          return (
            <List.Item
              key={account.id}
              title={account.name}
              subtitle={presentation.label}
              icon={{
                source: Icon.Person,
                tintColor: presentation.color,
              }}
              accessories={[
                {
                  icon: { source: presentation.statusIcon, tintColor: presentation.color },
                  tooltip: presentation.tooltip,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {status === "unauthorized" && (
                      <Action
                        title="Authorize Account"
                        icon={Icon.Key}
                        onAction={() => handleAuthorizeAccount(account)}
                      />
                    )}
                    {status === "expired" && (
                      <Action
                        title="Re-authorize Account"
                        icon={Icon.Key}
                        onAction={() => handleAuthorizeAccount(account)}
                      />
                    )}
                    <Action.Push
                      title="Rename Account"
                      icon={Icon.Pencil}
                      target={<RenameAccountForm account={account} onRename={handleRenameAccount} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Remove Account"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemoveAccount(account)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadAccounts}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Add New Account"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Account"
                icon={Icon.Plus}
                target={<AddAccountForm onAdd={handleAddAccount} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function AddAccountForm({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Account name is required");
      return;
    }

    await onAdd(name.trim());
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        placeholder="e.g., Work, Personal, School"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Description text="Give this Gmail account a memorable name. You'll use this to identify it when viewing 2FA codes." />
    </Form>
  );
}

function RenameAccountForm({
  account,
  onRename,
}: {
  account: Account;
  onRename: (account: Account, newName: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(account.name);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Account name is required");
      return;
    }

    if (name.trim() === account.name) {
      setNameError("New name must be different from current name");
      return;
    }

    await onRename(account, name.trim());
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New Account Name"
        placeholder="e.g., Work, Personal, School"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Description text={`Renaming "${account.name}". This won't affect authorization status.`} />
    </Form>
  );
}
