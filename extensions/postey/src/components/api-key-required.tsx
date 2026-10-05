import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { POSTEY_API_SETTINGS_URL } from "../lib/constants";

export function ApiKeyRequiredView() {
  return (
    <List searchBarPlaceholder="">
      <List.EmptyView
        title="Postey API Key Required"
        description={`Generate your API key at ${POSTEY_API_SETTINGS_URL} and paste it in Raycast preferences.`}
        icon={Icon.Key}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open API Settings" url={POSTEY_API_SETTINGS_URL} icon={Icon.Link} />
          </ActionPanel>
        }
      />
    </List>
  );
}
