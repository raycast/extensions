import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import { useUserData } from "../load/user-data-provider";
export function AccountActions() {
  const account = useUserData();
  return (
    <ActionPanel.Section
      title={
        account.data
          ? `Hotkys: ${account.data.profile.displayName ?? "Connected"}`
          : account.error
            ? "Account sync failed"
            : "Hotkys account"
      }
    >
      {account.data ? (
        <Action title="Disconnect Hotkys Account" icon={Icon.Person} onAction={account.disconnect} />
      ) : (
        <Action title="Connect Hotkys Account" icon={Icon.Person} onAction={account.connect} />
      )}
      <Action title="Retry Account Sync" icon={Icon.ArrowClockwise} onAction={account.revalidate} />
      <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}
