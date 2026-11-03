import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Account, label, listAccounts, Provider, resolveBinary, run, switchArgs, UsageWindow } from "./ccswap";

const TITLES: Record<Provider, string> = { claude: "Claude Code", codex: "Codex" };

// Mirrors the CLI's post-switch hints, which --json output leaves out.
const AFTER_SWITCH: Record<Provider, string> = {
  claude: "Open sessions pick it up within about 30 seconds",
  codex: "Restart any open Codex session to use it",
};

function windowTag(name: string, window: UsageWindow | undefined): List.Item.Accessory[] {
  if (!window) return [];
  const pct = Math.round(window.pct);
  const color = pct >= 90 ? Color.Red : pct >= 70 ? Color.Orange : undefined;
  return [{ tag: { value: `${name} ${pct}%`, color }, tooltip: window.countdown && `Resets in ${window.countdown}` }];
}

function accessories(account: Account): List.Item.Accessory[] {
  const usage = account.usage;
  return [
    ...(account.disabled ? [{ tag: "Disabled" }] : []),
    ...windowTag("5h", usage?.fiveHour),
    ...windowTag("7d", usage?.sevenDay ?? usage?.weekly),
    ...(account.active ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Active" }] : []),
  ];
}

export default function Command() {
  const bin = resolveBinary(getPreferenceValues<Preferences>().ccswapPath || undefined);
  const { data, error, isLoading, revalidate } = useCachedPromise(listAccounts, [bin ?? ""], { execute: !!bin });

  async function switchTo(provider: Provider, number?: number) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Switching…" });
    try {
      await run(bin!, switchArgs(provider, number));
    } catch (error) {
      await showFailureToast(error, { title: "Switch failed" });
      return;
    }
    // The switch already happened, so a failed lookup only loses the account name.
    const active = (await listAccounts(bin!).catch(() => undefined))?.[provider].find((a) => a.active);
    revalidate();
    toast.style = Toast.Style.Success;
    toast.title = `${TITLES[provider]}: ${active ? label(active) : "switched"}`;
    toast.message = AFTER_SWITCH[provider];
  }

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Terminal}
          title="ccswap Not Found"
          description="Install it with `uv tool install ccswap`, or set its path in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error && !data) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't Load Accounts"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const bestAction = (provider: Provider, shortcut?: Keyboard.Shortcut) => (
    <Action title="Switch to Best Account" icon={Icon.Stars} shortcut={shortcut} onAction={() => switchTo(provider)} />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts…">
      {(["claude", "codex"] as const).map((provider) => (
        <List.Section key={provider} title={TITLES[provider]}>
          {(data?.[provider] ?? []).map((account) => (
            <List.Item
              key={`${provider}-${account.number}`}
              icon={account.active ? Icon.PersonCircle : Icon.Person}
              title={label(account)}
              subtitle={account.alias ? account.email : account.organizationName}
              keywords={[account.email, String(account.number)]}
              accessories={accessories(account)}
              actions={
                <ActionPanel>
                  {/* Raycast hides shortcuts on the first two actions, so ⌘B sits third. */}
                  {account.active ? (
                    bestAction(provider)
                  ) : (
                    <Action
                      title="Switch to Account"
                      icon={Icon.Switch}
                      onAction={() => switchTo(provider, account.number)}
                    />
                  )}
                  <Action.CopyToClipboard title="Copy Email" content={account.email} />
                  {!account.active && bestAction(provider, { modifiers: ["cmd"], key: "b" })}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
