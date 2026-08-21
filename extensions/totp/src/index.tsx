import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { type Account, loadAccounts, removeAccount, saveAccount, updateAccount } from "./accounts";
import { AddAccountForm } from "./add-account";
import { BackupForm } from "./backup-form";
import { generateCode } from "./totp";

export default function TOTP() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setNow] = useState(Date.now());

  async function refresh() {
    try {
      setAccounts(await loadAccounts());
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not load accounts", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function add(input: Parameters<typeof saveAccount>[0]) {
    await saveAccount(input);
    await refresh();
  }

  async function edit(account: Account, input: Parameters<typeof saveAccount>[0]) {
    await updateAccount(account.id, input);
    await refresh();
  }

  async function copyCode(value: string) {
    await Clipboard.copy(value, { concealed: true });
    await showHUD("OTP copied");
  }

  async function remove(account: Account) {
    const confirmed = await confirmAlert({
      title: `Remove ${account.name}?`,
      message: "This permanently removes the saved TOTP secret.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeAccount(account.id);
    await refresh();
  }

  const addAction = (
    <Action.Push
      title="Add Account"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      target={<AddAccountForm onAdd={add} />}
    />
  );
  const backupActions = <ActionPanel.Section>
    <Action.Push title="Export Encrypted Backup" icon={Icon.Download} target={<BackupForm mode="export" onImported={refresh} />} />
    <Action.Push title="Import Encrypted Backup" icon={Icon.Upload} target={<BackupForm mode="import" onImported={refresh} />} />
  </ActionPanel.Section>;

  return (
    <List isLoading={isLoading} navigationTitle="TOTP" searchBarPlaceholder="Search accounts" actions={<ActionPanel>{addAction}{backupActions}</ActionPanel>}>
      {accounts.map((account) => {
        const code = generateCode(account);
        return (
          <List.Item
            key={account.id}
            title={account.name}
            subtitle={account.issuer && account.issuer !== account.name ? account.issuer : undefined}
            keywords={[account.name, account.issuer].filter(Boolean)}
            accessories={[{ text: `${code.value}  ·  ${code.remainingSeconds}s` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy OTP"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => void copyCode(code.value)}
                  />
                  <Action.Push
                    title="Edit Account"
                    icon={Icon.Pencil}
                    target={
                      <AddAccountForm
                        title="Edit TOTP Account"
                        initialSecret={account.secret}
                        initialName={account.name}
                        initialIssuer={account.issuer}
                        onAdd={(input) => edit(account, input)}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Secret Key"
                    icon={Icon.Key}
                    content={account.secret}
                    concealed
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Paste title="Paste OTP" content={code.value} />
                </ActionPanel.Section>
                <ActionPanel.Section>{addAction}</ActionPanel.Section>
                <Action
                  title="Remove Account"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => void remove(account)}
                />
                {backupActions}
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && accounts.length === 0 && <List.EmptyView icon={Icon.Key} title="No TOTP accounts" description="Add an account from a Base32 secret or otpauth URI." actions={<ActionPanel>{addAction}{backupActions}</ActionPanel>} />}
    </List>
  );
}
