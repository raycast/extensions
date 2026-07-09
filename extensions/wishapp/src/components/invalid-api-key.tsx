import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { API_BASE } from "../lib/types";

export function InvalidApiKeyView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Invalid API Key"
        description="WishApp rejected your API key. Generate a new one at getwish.app/settings, then update it in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Generate API Key" url={`${API_BASE}/settings`} />
          </ActionPanel>
        }
      />
    </List>
  );
}
