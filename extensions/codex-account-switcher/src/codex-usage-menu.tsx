import { useCallback, useEffect, useState } from "react";
import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
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
  getRefreshMode,
  listAccounts,
} from "./lib/codex-auth";
import { getCopy } from "./lib/i18n";
import {
  accountTitle,
  remainingPercent,
  resetTooltip,
  updatedAtLabel,
  windowLabel,
} from "./lib/presentation";

type MenuState = {
  account?: CodexAccount;
  isLoading: boolean;
  error?: string;
  errorCode?: string;
};

export default function Command() {
  const [state, setState] = useState<MenuState>({ isLoading: true });
  const refreshMode = getRefreshMode();
  const copy = getCopy();

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: undefined, errorCode: undefined }));
    try {
      const result = await listAccounts(refreshMode, true);
      setState({ account: result.accounts.find((account) => account.active), isLoading: false });
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : copy.unableToReadUsage,
        errorCode: error instanceof CodexAuthError ? error.code : undefined,
      });
    }
  }, [copy, refreshMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const account = state.account;
  const displayedAccountTitle = account ? accountTitle(account) : undefined;
  const primaryRemaining = remainingPercent(account?.usage.primary ?? null);
  const menuTitle = primaryRemaining === null ? undefined : `${primaryRemaining}%`;
  const tooltip = account
    ? `${accountTitle(account)} · ${windowLabel(account.usage.primary, copy.fiveHour)}`
    : state.error;
  const installRequired = state.errorCode === "executable_not_found";

  return (
    <MenuBarExtra
      icon={
        state.error ? Icon.Warning : { source: "menu-bar-icon-outline-v2.png", tintColor: Color.PrimaryText }
      }
      title={menuTitle}
      tooltip={tooltip}
      isLoading={state.isLoading}
    >
      {installRequired ? (
        <>
          <MenuBarExtra.Item icon={Icon.Terminal} title={copy.codexAuthRequired} />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              icon={Icon.Clipboard}
              title={copy.copyInstallCommand}
              onAction={copyInstallCommand}
            />
            <MenuBarExtra.Item
              icon={Icon.Link}
              title={copy.openInstallationGuide}
              onAction={() => open(CODEX_AUTH_INSTALL_URL)}
            />
            <MenuBarExtra.Item icon={Icon.ArrowClockwise} title={copy.retry} onAction={load} />
            <MenuBarExtra.Item
              icon={Icon.Gear}
              title={copy.extensionPreferences}
              onAction={openExtensionPreferences}
            />
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
          <MenuBarExtra.Section title={copy.remainingUsage}>
            <MenuBarExtra.Item
              title={menuUsageLabel(account.usage.primary, copy.fiveHour, false)}
              onAction={load}
            />
            <MenuBarExtra.Item
              title={menuUsageLabel(account.usage.secondary, copy.week, true)}
              onAction={load}
            />
            <MenuBarExtra.Item title={updatedAtLabel(account.usage)} />
          </MenuBarExtra.Section>
        </>
      ) : null}
      {!installRequired ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Switch} title={copy.switchAccount} onAction={openSwitcher} />
          <MenuBarExtra.Item icon={Icon.ArrowClockwise} title={copy.refresh} onAction={load} />
          <MenuBarExtra.Item
            icon={Icon.Gear}
            title={copy.extensionPreferences}
            onAction={openExtensionPreferences}
          />
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
  await showHUD(getCopy().installCommandCopied);
}
