import { Action, ActionPanel, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";

export const SCHWAB_DEVELOPER_PORTAL_URL = "https://developer.schwab.com";
export const OAUTH_CALLBACK_URL = "https://raycast.com/redirect?packageName=Extension";

export function Onboarding() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="One-time Schwab app setup"
        description={
          "Save your App Key and Secret once in extension preferences. Weekly sign-in keeps these settings.\nAlready set up? Check that you opened the same store or development installation."
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
