import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { deleteAccount, listAccounts } from "./storage";
import { generateTotpCode, secondsRemaining } from "./totp";
import type { TotpAccount } from "./types";

export default function Command() {
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setIsLoading(true);
      const data = await listAccounts();
      setAccounts(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(
    () =>
      [...accounts].sort((a, b) =>
        `${a.issuer} ${a.account}`.localeCompare(`${b.issuer} ${b.account}`),
      ),
    [accounts],
  );

  async function copyCode(code: string) {
    await Clipboard.copy(code, { concealed: true });
    await showToast({ style: Toast.Style.Success, title: "Code copied" });
  }

  async function pasteCode(code: string) {
    await Clipboard.paste(code);
  }

  async function removeAccount(account: TotpAccount) {
    const confirmed = await confirmAlert({
      title: "Delete 2FA Account",
      message: `Are you sure you want to delete ${account.issuer} · ${account.account}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await deleteAccount(account.id);
    await load();
    await showToast({ style: Toast.Style.Success, title: "Account deleted" });
  }

  if (!isLoading && error) {
    return (
      <List
        searchBarPlaceholder="Search by issuer or account"
        isLoading={false}
      >
        <List.EmptyView title="Error" description={error} />
      </List>
    );
  }

  if (!isLoading && sorted.length === 0) {
    return (
      <List
        searchBarPlaceholder="Search by issuer or account"
        isLoading={false}
      >
        <List.EmptyView
          title="No 2FA accounts yet"
          description="Add one with Add Account or Import from QR Image"
          icon={Icon.Lock}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by issuer or account"
    >
      {sorted.map((account) => {
        const code = generateTotpCode({
          secretBase32: account.secretBase32,
          digits: account.digits,
          period: account.period,
          algorithm: account.algorithm,
          timestampMs: now,
        });
        const remaining = secondsRemaining(account.period, now);

        return (
          <List.Item
            key={account.id}
            title={`${account.issuer} · ${account.account}`}
            subtitle={`${account.algorithm} · ${account.digits}d · ${account.period}s`}
            accessories={[{ text: `${code} (${remaining}s)` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Code"
                  onAction={() => void copyCode(code)}
                />
                <Action
                  title="Paste Code"
                  onAction={() => void pasteCode(code)}
                />
                <Action
                  title="Delete Account"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => void removeAccount(account)}
                />
                <Action
                  title="Reload"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => void load()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
