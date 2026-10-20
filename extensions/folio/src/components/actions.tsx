import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

export const SHORTCUTS = {
  privacy: { modifiers: ["cmd", "shift"], key: "p" } satisfies Keyboard.Shortcut,
  refresh: { modifiers: ["cmd"], key: "r" } satisfies Keyboard.Shortcut,
  detail: { modifiers: ["cmd"], key: "i" } satisfies Keyboard.Shortcut,
};

export function PrivacyAction({ privacy, onToggle }: { privacy: boolean; onToggle: () => Promise<void> }) {
  return (
    <Action
      title={privacy ? "Show Balances" : "Hide Balances"}
      icon={privacy ? Icon.Eye : Icon.EyeDisabled}
      shortcut={SHORTCUTS.privacy}
      onAction={async () => {
        await onToggle();
        await showToast({ style: Toast.Style.Success, title: privacy ? "Balances visible" : "Balances hidden" });
      }}
    />
  );
}

export function RefreshAction({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={SHORTCUTS.refresh}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing…" });
        try {
          await onRefresh();
          toast.style = Toast.Style.Success;
          toast.title = "Refreshed";
        } catch (e) {
          toast.style = Toast.Style.Failure;
          toast.title = "Refresh failed";
          toast.message = e instanceof Error ? e.message : String(e);
        }
      }}
    />
  );
}

/** Trading is not available to SnapTrade OAuth apps. Kept as a visible stub so users know why. */
export function TradeStubAction() {
  return (
    <Action
      title="Trade (Not on OAuth)"
      icon={Icon.Lock}
      onAction={() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Trading is not available",
          message: "SnapTrade OAuth apps are read-only. Folio can't place orders.",
        })
      }
    />
  );
}

export function launch(name: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated }).catch(() => undefined);
}

export function NavigationActions() {
  return (
    <ActionPanel.Section title="Go To">
      <Action title="Show Portfolio" icon={Icon.PieChart} onAction={() => launch("show-portfolio")} />
      <Action title="Show Positions" icon={Icon.List} onAction={() => launch("show-positions")} />
      <Action title="Show Fog" icon={Icon.Cloud} onAction={() => launch("show-fog")} />
      <Action title="Show Activities" icon={Icon.Receipt} onAction={() => launch("show-activities")} />
      <Action title="Connect Brokerage" icon={Icon.Link} onAction={() => launch("connect-brokerage")} />
      <Action title="Sign in with SnapTrade" icon={Icon.Person} onAction={() => launch("sign-in")} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}
