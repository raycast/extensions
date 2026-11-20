import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { tokenSettingsUrl } from "../railway";

export function MissingTokenView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Add Your Railway API Token"
        description="Create a token on Railway, then add it in the extension preferences"
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Create Token on Railway" url={tokenSettingsUrl} />
          </ActionPanel>
        }
      />
    </List>
  );
}
