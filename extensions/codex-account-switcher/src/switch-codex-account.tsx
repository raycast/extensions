import { useCallback, useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import {
  CODEX_AUTH_INSTALL_COMMAND,
  CODEX_AUTH_INSTALL_URL,
  CodexAccount,
  CodexAuthError,
  listAccounts,
  loginAccount,
  removeAccount,
  switchAccount,
} from "./lib/codex-auth";
import {
  accountSubtitle,
  accountTitle,
  percentageLabel,
  planColor,
  planLabel,
  resetTooltip,
  sourceTooltip,
  usageWindowName,
  usageSummary,
} from "./lib/presentation";

type ViewState = {
  accounts: CodexAccount[];
  isLoading: boolean;
  error?: string;
  errorCode?: string;
};

export default function Command() {
  const [state, setState] = useState<ViewState>({ accounts: [], isLoading: true });
  const latestLoadId = useRef(0);
  const refreshMode = getPreferenceValues<Preferences.SwitchCodexAccount>().refreshMode;

  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    setState((current) => ({ ...current, isLoading: true, error: undefined, errorCode: undefined }));
    try {
      const result = await listAccounts(refreshMode);
      if (loadId !== latestLoadId.current) return;
      setState({ accounts: result.accounts, isLoading: false });
    } catch (error) {
      if (loadId !== latestLoadId.current) return;
      const message = error instanceof Error ? error.message : "Unable to Read Codex Accounts";
      setState({
        accounts: [],
        isLoading: false,
        error: message,
        errorCode: error instanceof CodexAuthError ? error.code : undefined,
      });
    }
  }, [refreshMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const performSwitch = useCallback(
    async (account: CodexAccount) => {
      if (account.active) {
        await showToast({ style: Toast.Style.Success, title: "This account is already active" });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Switching to ${accountTitle(account)}`,
      });
      try {
        await switchAccount(account.account_key);
        toast.style = Toast.Style.Success;
        toast.title = `Switched to ${accountTitle(account)}`;
        toast.message = "Restart any running Codex client to apply the change";
        await load();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to Switch Account";
        toast.message = error instanceof CodexAuthError ? error.message : "Try again later";
      }
    },
    [load],
  );

  const performLogin = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Codex Login",
      message: "Complete the sign-in process in your browser",
    });
    try {
      await loginAccount();
      toast.style = Toast.Style.Success;
      toast.title = "Account Added";
      toast.message = "The new account is now active";
      await load();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to Sign In";
      toast.message = error instanceof CodexAuthError ? error.message : "Try again later";
    }
  }, [load]);

  const performRemove = useCallback(
    async (account: CodexAccount) => {
      const confirmed = await confirmAlert({
        icon: Icon.Trash,
        title: `Remove ${accountTitle(account)}?`,
        message: account.active
          ? state.accounts.length === 1
            ? "This is the last saved account and is currently active. Removing it will also remove the local Codex login."
            : "This account is currently active. After removal, codex-auth will select another saved account."
          : "This account will be removed from codex-auth. This action cannot be undone.",
        primaryAction: {
          title: "Remove Account",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Removing ${accountTitle(account)}`,
      });
      try {
        await removeAccount(account.account_key);
        toast.style = Toast.Style.Success;
        toast.title = "Account Removed";
        toast.message = account.active ? "The active Codex account has been updated" : undefined;
        await load();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to Remove Account";
        toast.message = error instanceof CodexAuthError ? error.message : "Try again later";
      }
    },
    [load, state.accounts.length],
  );

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search accounts, aliases, or workspaces">
      {state.errorCode === "executable_not_found" ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="codex-auth Is Required"
          description="Install codex-auth 0.3.0 or newer, then retry."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={CODEX_AUTH_INSTALL_COMMAND}
                onCopy={() => void showToast({ style: Toast.Style.Success, title: "Install command copied" })}
              />
              <Action.OpenInBrowser title="Open Installation Guide" icon={Icon.Link} url={CODEX_AUTH_INSTALL_URL} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : state.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to Read Codex Accounts"
          description={state.error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
              <Action
                title="Add Account"
                icon={Icon.AddPerson}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={performLogin}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : state.accounts.length === 0 && !state.isLoading ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No Saved Accounts"
          description="Sign in to Codex to add an account here."
          actions={
            <ActionPanel>
              <Action
                title="Add Account"
                icon={Icon.AddPerson}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={performLogin}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        state.accounts.map((account) => (
          <List.Item
            key={account.account_key}
            icon={account.active ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Person}
            title={accountTitle(account)}
            subtitle={accountSubtitle(account)}
            keywords={[account.email, account.alias ?? "", account.account_name ?? "", account.plan ?? ""]}
            accessories={[
              {
                text: usageWindowName(account.usage.primary, "5-hour"),
                tooltip: resetTooltip(account.usage.primary),
              },
              {
                text: { value: percentageLabel(account.usage.primary), color: Color.PrimaryText },
                tooltip: resetTooltip(account.usage.primary),
              },
              {
                icon: {
                  source: "quota-divider.svg",
                  tintColor: { light: "#B8B8BC", dark: "#6A6A6E", adjustContrast: false },
                },
              },
              {
                text: usageWindowName(account.usage.secondary, "Week"),
                tooltip: resetTooltip(account.usage.secondary),
              },
              {
                text: { value: percentageLabel(account.usage.secondary), color: Color.PrimaryText },
                tooltip: resetTooltip(account.usage.secondary),
              },
              {
                tag: {
                  value: planLabel(account.plan) ?? "Unknown",
                  color: planColor(account.plan),
                },
                tooltip: `${usageSummary(account)}\n${sourceTooltip(account.usage)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={account.active ? "Current Account" : "Switch to This Account"}
                  icon={account.active ? Icon.CheckCircle : Icon.ArrowRight}
                  onAction={() => performSwitch(account)}
                />
                <Action
                  title="Add Account"
                  icon={Icon.AddPerson}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={performLogin}
                />
                <Action
                  title="Refresh Usage"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={load}
                />
                <Action.CopyToClipboard title="Copy Email" content={account.email} />
                <Action
                  title="Remove Account"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => performRemove(account)}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
