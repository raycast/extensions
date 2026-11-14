import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { API_KEY_URL } from "../lib/api";

export function Setup() {
  return (
    <List navigationTitle="AI Model Rankings" searchBarPlaceholder="Set up Artificial Analysis">
      <List.EmptyView
        icon={Icon.Key}
        title="Add Your API Key"
        description="Rankings need a free Artificial Analysis API key. Press ↵ to paste yours in preferences, or ⌘↵ to create one."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Get a Free API Key" url={API_KEY_URL} />
          </ActionPanel>
        }
      />
    </List>
  );
}
