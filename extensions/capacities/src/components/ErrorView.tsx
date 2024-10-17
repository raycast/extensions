import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function ErrorView({ error }: { error: string }) {
return <Detail
markdown={error}
actions={
  <ActionPanel>
    <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
  </ActionPanel>
}
/>
}