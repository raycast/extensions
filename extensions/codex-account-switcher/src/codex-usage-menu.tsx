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
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  CODEX_AUTH_INSTALL_COMMAND,
  CODEX_AUTH_INSTALL_URL,
  CodexAuthError,
  UsageWindow,
  listAccounts,
} from "./lib/codex-auth";
import { accountTitle, remainingPercent, resetTooltip, updatedAtLabel, windowLabel } from "./lib/presentation";

export default function Command() {
  const refreshMode = getPreferenceValues<Preferences.CodexUsageMenu>().refreshMode;
  const { data, error, isLoading, revalidate } = usePromise(listAccounts, [refreshMode, true], {
    onError: () => {},
  });
  const account = data?.accounts.find((candidate) => candidate.active);
  const displayedAccountTitle = account ? accountTitle(account) : undefined;
  const primaryRemaining = remainingPercent(account?.usage.primary ?? null);
  const menuTitle = primaryRemaining === null ? undefined : `${primaryRemaining}%`;
  const tooltip = account
    ? `${accountTitle(account)} · ${windowLabel(account.usage.primary, "5-hour")}`
    : error?.message;
  const installRequired = error instanceof CodexAuthError && error.code === "executable_not_found";

  return (
    <MenuBarExtra
      icon={error ? Icon.Warning : { source: "menu-bar-icon-outline-v2.png", tintColor: Color.PrimaryText }}
      title={menuTitle}
      tooltip={tooltip}
      isLoading={isLoading}
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
            <MenuBarExtra.Item icon={Icon.ArrowClockwise} title="Retry" onAction={revalidate} />
            <MenuBarExtra.Item icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
          </MenuBarExtra.Section>
        </>
      ) : error ? (
        <MenuBarExtra.Item icon={Icon.Warning} title={error.message} />
      ) : null}
      {!installRequired && account ? (
        <>
          <MenuBarExtra.Item
            icon={Icon.Person}
            title={displayedAccountTitle ?? account.email}
            subtitle={displayedAccountTitle === account.email ? undefined : account.email}
          />
          <MenuBarExtra.Section title="Remaining Usage">
            <MenuBarExtra.Item title={menuUsageLabel(account.usage.primary, "5-hour", false)} onAction={revalidate} />
            <MenuBarExtra.Item title={menuUsageLabel(account.usage.secondary, "Week", true)} onAction={revalidate} />
            <MenuBarExtra.Item title={updatedAtLabel(account.usage)} />
          </MenuBarExtra.Section>
        </>
      ) : null}
      {!installRequired ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Switch} title="Switch Account" onAction={openSwitcher} />
          <MenuBarExtra.Item icon={Icon.ArrowClockwise} title="Refresh" onAction={revalidate} />
          <MenuBarExtra.Item icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}

async function openSwitcher() {
  try {
    await launchCommand({ name: "switch-codex-account", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to Open Account Switcher" });
  }
}

function menuUsageLabel(window: UsageWindow | null, fallback: string, includeResetDate: boolean) {
  const reset = resetTooltip(window, includeResetDate);
  return reset ? `${windowLabel(window, fallback)} (${reset})` : windowLabel(window, fallback);
}

async function copyInstallCommand() {
  await Clipboard.copy(CODEX_AUTH_INSTALL_COMMAND);
  await showHUD("Install command copied");
}
