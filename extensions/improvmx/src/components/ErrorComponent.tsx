import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function ErrorComponent({error}: {error: Error}) {
    return <Detail
    navigationTitle="Error"
      markdown={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
}