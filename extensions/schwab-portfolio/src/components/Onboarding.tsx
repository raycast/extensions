import { Action, ActionPanel, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";

export const SCHWAB_DEVELOPER_PORTAL_URL = "https://developer.schwab.com";
export const OAUTH_CALLBACK_URL = "https://raycast.com/redirect?packageName=Extension";

export function Onboarding() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Connect your Schwab account"
        description={
          "Add your Schwab App Key and Secret in the extension preferences.\nNeed credentials? Press ⌘⏎ to open the Schwab developer portal."
        }
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open Schwab Developer Portal" url={SCHWAB_DEVELOPER_PORTAL_URL} />
            <Action.CopyToClipboard
              title="Copy Callback URL for App Setup"
              content={OAUTH_CALLBACK_URL}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
