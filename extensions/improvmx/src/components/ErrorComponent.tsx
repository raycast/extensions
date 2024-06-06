import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function ErrorComponent({error}: {error: Error, showUpgradeAction?: boolean}) {
  const showUpgradeAction = error.message.startsWith("Your account is limited to");
  return <Detail
    navigationTitle="Error"
      markdown={"⚠️" + error.message}
      actions={
        <ActionPanel>
          {showUpgradeAction && <Action.OpenInBrowser url="https://app.improvmx.com/account/payment" title="Upgrade Account" />}
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
}