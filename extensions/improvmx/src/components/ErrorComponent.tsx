import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function ErrorComponent({
  error,
  showUpgradeAction = false,
}: {
  error: Error;
  showUpgradeAction?: boolean;
}) {
  const showUpgrade = showUpgradeAction || error.message.startsWith("Your account is limited to");
  return (
    <Detail
      navigationTitle="Error"
      markdown={"⚠️" + error.message}
      actions={
        <ActionPanel>
          {showUpgrade && (
            <Action.OpenInBrowser url="https://app.improvmx.com/account/payment" title="Upgrade Account" />
          )}
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
