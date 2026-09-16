import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Account, loadAccounts, removeAccount, saveAccount, updateAccount } from "./accounts";
import { AddAccountForm } from "./add-account";
import { BackupForm } from "./backup-form";
import { generateCode } from "./totp";

type AccountInput = Parameters<typeof saveAccount>[0];

export default function TOTP() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setAccounts(await loadAccounts());
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not load accounts", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(async (input: AccountInput) => {
    await saveAccount(input);
    await refresh();
  }, [refresh]);

  const edit = useCallback(async (account: Account, input: AccountInput) => {
    await updateAccount(account.id, input);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (account: Account) => {
    const confirmed = await confirmAlert({
      title: `Remove ${account.name}?`,
      message: "This permanently removes the saved TOTP secret.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeAccount(account.id);
    await refresh();
  }, [refresh]);

  const addAction = useMemo(() => (
    <Action.Push
      title="Add Account"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      target={<AddAccountForm onAdd={add} />}
    />
  ), [add]);
  const backupActions = useMemo(() => (
    <ActionPanel.Section>
      <Action.Push title="Export Encrypted Backup" icon={Icon.Download} target={<BackupForm mode="export" onImported={refresh} />} />
      <Action.Push title="Import Encrypted Backup" icon={Icon.Upload} target={<BackupForm mode="import" onImported={refresh} />} />
    </ActionPanel.Section>
  ), [refresh]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="TOTP"
      searchBarPlaceholder="Search accounts"
      onSelectionChange={(id) => id && setSelectedAccountId(id)}
      actions={<ActionPanel>{addAction}{backupActions}</ActionPanel>}
    >
      {accounts.map((account) => (
        <AccountItem
          key={account.id}
          account={account}
          frozen={selectedAccountId === account.id}
          addAction={addAction}
          backupActions={backupActions}
          onEdit={edit}
          onRemove={remove}
        />
      ))}
      {!isLoading && accounts.length === 0 && (
        <List.EmptyView
          icon={Icon.Key}
          title="No TOTP accounts"
          description="Add an account from a Base32 secret or otpauth URI."
          actions={<ActionPanel>{addAction}{backupActions}</ActionPanel>}
        />
      )}
    </List>
  );
}

const AccountItem = memo(function AccountItem({
  account,
  frozen,
  addAction,
  backupActions,
  onEdit,
  onRemove,
}: {
  account: Account;
  frozen: boolean;
  addAction: ReactNode;
  backupActions: ReactNode;
  onEdit: (account: Account, input: AccountInput) => Promise<void>;
  onRemove: (account: Account) => Promise<void>;
}) {
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    if (frozen) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [frozen]);

  const actions = useMemo(() => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Copy OTP"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={async () => {
            await Clipboard.copy(generateCode(account).value, { concealed: true });
            await showHUD("OTP copied");
          }}
        />
        <Action title="Paste OTP" icon={Icon.Clipboard} onAction={() => Clipboard.paste(generateCode(account).value)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Account"
          icon={Icon.Pencil}
          target={
            <AddAccountForm
              title="Edit TOTP Account"
              initialSecret={account.secret}
              initialName={account.name}
              initialIssuer={account.issuer}
              onAdd={(input) => onEdit(account, input)}
            />
          }
        />
        {addAction}
        <Action.CopyToClipboard
          title="Copy Secret Key"
          icon={Icon.Key}
          content={account.secret}
          concealed
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <Action
        title="Remove Account"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => onRemove(account)}
      />
      {backupActions}
    </ActionPanel>
  ), [account, addAction, backupActions, onEdit, onRemove]);

  const code = generateCode(account);
  return (
    <List.Item
      title={account.name}
      subtitle={account.issuer && account.issuer !== account.name ? account.issuer : undefined}
      keywords={[account.name, account.issuer].filter(Boolean)}
      accessories={[{ text: `${code.value}  ·  ${code.remainingSeconds}s` }]}
      actions={actions}
    />
  );
});
