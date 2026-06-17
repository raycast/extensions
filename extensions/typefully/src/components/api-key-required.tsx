import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { TYPEFULLY_API_SETTINGS_URL } from "../lib/constants";

export function ApiKeyRequiredView() {
  return (
    <List searchBarPlaceholder="">
      <List.EmptyView
        title="Typefully API Key Required"
        description={`Generate your API key at ${TYPEFULLY_API_SETTINGS_URL} and paste it in Raycast preferences.`}
        icon={Icon.Key}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open API Settings" url={TYPEFULLY_API_SETTINGS_URL} icon={Icon.Link} />
          </ActionPanel>
        }
      />
    </List>
  );
}
