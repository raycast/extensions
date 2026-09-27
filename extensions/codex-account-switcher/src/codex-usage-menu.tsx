import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import {
  CODEX_AUTH_INSTALL_COMMAND,
  CODEX_AUTH_INSTALL_URL,
  CodexAccount,
  CodexAuthError,
  UsageWindow,
  listAccounts,
} from "./lib/codex-auth";
import { accountTitle, remainingPercent, resetTooltip, updatedAtLabel, windowLabel } from "./lib/presentation";

type MenuState = {
  account?: CodexAccount;
  isLoading: boolean;
  error?: string;
  errorCode?: string;
};

export default function Command() {
  const [state, setState] = useState<MenuState>({ isLoading: true });
  const latestLoadId = useRef(0);
  const refreshMode = getPreferenceValues<Preferences.CodexUsageMenu>().refreshMode;

  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    setState((current) => ({ ...current, isLoading: true, error: undefined, errorCode: undefined }));
    try {
      const result = await listAccounts(refreshMode, true);
      if (loadId !== latestLoadId.current) return;
      setState({ account: result.accounts.find((account) => account.active), isLoading: false });
    } catch (error) {
      if (loadId !== latestLoadId.current) return;
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to read Codex usage.",
        errorCode: error instanceof CodexAuthError ? error.code : undefined,
      });
    }
  }, [refreshMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const account = state.account;
  const displayedAccountTitle = account ? accountTitle(account) : undefined;
  const primaryRemaining = remainingPercent(account?.usage.primary ?? null);
  const menuTitle = primaryRemaining === null ? undefined : `${primaryRemaining}%`;
  const tooltip = account ? `${accountTitle(account)} · ${windowLabel(account.usage.primary, "5-hour")}` : state.error;
  const installRequired = state.errorCode === "executable_not_found";

  return (
    <MenuBarExtra
      icon={state.error ? Icon.Warning : { source: "menu-bar-icon-outline-v2.png", tintColor: Color.PrimaryText }}
      title={menuTitle}
      tooltip={tooltip}
      isLoading={state.isLoading}
    >
      {installRequired ? (
        <>
          <MenuBarExtra.Item icon={Icon.Terminal} title="codex-auth Is Required" />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item icon={Icon.Clipboard} title="Copy Install Command" onAction={copyInstallCommand} />
            <MenuBarExtra.Item
              icon={Icon.Link}
              title="Open Installation Guide"
              onAction={() => open(CODEX_AUTH_INSTALL_URL)}
            />
            <MenuBarExtra.Item icon={Icon.ArrowClockwise} title="Retry" onAction={load} />
            <MenuBarExtra.Item icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
          </MenuBarExtra.Section>
        </>
      ) : state.error ? (
        <MenuBarExtra.Item icon={Icon.Warning} title={state.error} />
      ) : null}
      {!installRequired && account ? (
        <>
          <MenuBarExtra.Item
            icon={Icon.Person}
            title={displayedAccountTitle ?? account.email}
            subtitle={displayedAccountTitle === account.email ? undefined : account.email}
          />
          <MenuBarExtra.Section title="Remaining Usage">
            <MenuBarExtra.Item title={menuUsageLabel(account.usage.primary, "5-hour", false)} onAction={load} />
            <MenuBarExtra.Item title={menuUsageLabel(account.usage.secondary, "Week", true)} onAction={load} />
            <MenuBarExtra.Item title={updatedAtLabel(account.usage)} />
          </MenuBarExtra.Section>
        </>
      ) : null}
      {!installRequired ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Switch} title="Switch Account" onAction={openSwitcher} />
          <MenuBarExtra.Item icon={Icon.ArrowClockwise} title="Refresh" onAction={load} />
          <MenuBarExtra.Item icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}

async function openSwitcher() {
  await launchCommand({ name: "switch-codex-account", type: LaunchType.UserInitiated });
}

function menuUsageLabel(window: UsageWindow | null, fallback: string, includeResetDate: boolean) {
  const reset = resetTooltip(window, includeResetDate);
  return reset ? `${windowLabel(window, fallback)} (${reset})` : windowLabel(window, fallback);
}

async function copyInstallCommand() {
  await Clipboard.copy(CODEX_AUTH_INSTALL_COMMAND);
  await showHUD("Install command copied");
}
