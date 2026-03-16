// src/accounts/ManageAccountsForm.tsx
import {
  Form,
  Action,
  ActionPanel,
  useNavigation,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Alert,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import type { AccountEntry, AccountsProvider } from "./types";
import { loadAccounts, addAccount, updateAccount, deleteAccount } from "./storage";

interface ManageAccountsFormProps {
  provider: AccountsProvider;
  providerName: string; // e.g. "Kimi", "z.ai"
  onSave: () => void; // called after any mutation so the parent refreshes
}

export function ManageAccountsForm({ provider, providerName, onSave }: ManageAccountsFormProps) {
  const { pop } = useNavigation();
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newToken, setNewToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadAccounts(provider);
    setAccounts(loaded);
    setIsLoading(false);
  }, [provider]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = async () => {
    const labelTrimmed = newLabel.trim();
    const tokenTrimmed = newToken.trim();

    if (!labelTrimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Label is required" });
      return;
    }
    if (!tokenTrimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Token is required" });
      return;
    }

    const exists = accounts.some((a) => a.label.toLowerCase() === labelTrimmed.toLowerCase());
    if (exists) {
      await showToast({ style: Toast.Style.Failure, title: "Label already exists" });
      return;
    }

    try {
      await addAccount(provider, labelTrimmed, tokenTrimmed);
      onSave();
      setNewLabel("");
      setNewToken("");
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Added "${labelTrimmed}"` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save account",
        message: String(error),
      });
    }
  };

  const handleDelete = async (account: AccountEntry) => {
    const confirmed = await confirmAlert({
      title: `Remove "${account.label}"?`,
      message: "This account will be permanently deleted.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteAccount(provider, account.id);
      onSave();
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Removed "${account.label}"` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete account",
        message: String(error),
      });
    }
  };

  const handleCopyToken = async (account: AccountEntry) => {
    await Clipboard.copy(account.token);
    await showToast({ style: Toast.Style.Success, title: `Copied API key for "${account.label}"` });
  };

  const [editingLabel, setEditingLabel] = useState<Record<string, string>>({});

  const handleSaveLabel = async (account: AccountEntry) => {
    const newLabelValue = editingLabel[account.id]?.trim() ?? account.label;
    if (!newLabelValue) {
      await showToast({ style: Toast.Style.Failure, title: "Label cannot be empty" });
      return;
    }
    if (newLabelValue.toLowerCase() !== account.label.toLowerCase()) {
      const exists = accounts.some((a) => a.id !== account.id && a.label.toLowerCase() === newLabelValue.toLowerCase());
      if (exists) {
        await showToast({ style: Toast.Style.Failure, title: "Label already exists" });
        return;
      }
    }

    try {
      await updateAccount(provider, account.id, { label: newLabelValue });
      onSave();
      await refresh();
      await showToast({ style: Toast.Style.Success, title: `Updated label to "${newLabelValue}"` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update label",
        message: String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${providerName} Accounts`}
      actions={
        <ActionPanel>
          <Action title="Add Account" icon={Icon.Plus} onAction={handleAdd} />
          <ActionPanel.Section title="Account Actions">
            {accounts.map((account) => (
              <Action
                key={`copy-${account.id}`}
                title={`Copy API Key for "${account.label}"`}
                icon={Icon.Clipboard}
                onAction={() => void handleCopyToken(account)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Save Label Changes">
            {accounts.map((account) => (
              <Action
                key={`save-${account.id}`}
                title={`Save "${account.label}"`}
                icon={Icon.CheckCircle}
                onAction={() => void handleSaveLabel(account)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Remove Account">
            {accounts.map((account) => (
              <Action
                key={account.id}
                title={`Remove "${account.label}"`}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void handleDelete(account)}
              />
            ))}
          </ActionPanel.Section>
          <Action title="Done" icon={Icon.Checkmark} onAction={pop} />
        </ActionPanel>
      }
    >
      {/* Add New Account section at the TOP to prevent jitter */}
      <Form.Description title="Add New Account" text="Enter a label and paste the API token for the new account." />
      <Form.TextField
        id="new-label"
        title="Label"
        placeholder="e.g. Work, Personal"
        value={newLabel}
        onChange={setNewLabel}
      />
      <Form.PasswordField
        id="new-token"
        title="Token"
        placeholder="Paste API token here"
        value={newToken}
        onChange={setNewToken}
      />

      {accounts.length > 0 && <Form.Separator />}

      {/* Existing Accounts section at the BOTTOM */}
      {accounts.length > 0 && (
        <Form.Description title="Existing Accounts" text={`${accounts.length} account(s) configured.`} />
      )}

      {accounts.map((account) => (
        <Form.TextField
          key={account.id}
          id={`label-${account.id}`}
          title={account.label}
          placeholder="Account label"
          defaultValue={account.label}
          onChange={(val) => setEditingLabel((prev) => ({ ...prev, [account.id]: val }))}
        />
      ))}
    </Form>
  );
}
