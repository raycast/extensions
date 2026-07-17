import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { STARLING_DEVELOPER_PORTAL_URL, STARLING_PERSONAL_ACCESS_DOCS_URL } from "../lib/starling";

export function MissingTokenView() {
  const markdown = [
    "# Personal Access Token Required",
    "",
    "To access your own Starling account:",
    "",
    "1. Sign in to the [Starling Developer Portal](https://developer.starlingbank.com/login).",
    "2. Open **Personal Access**.",
    "3. Link your Starling Bank account to your Starling Developer account.",
    "4. Create a new token and select all permissions except:",
    "   - `payee:create`",
    "   - `pay-local:create`",
    "   - `standing-order:create`",
    "5. Copy the token and paste it in Extension Preferences.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Starling Developer Portal" url={STARLING_DEVELOPER_PORTAL_URL} />
          <Action.OpenInBrowser title="Open Token Setup Guide" url={STARLING_PERSONAL_ACCESS_DOCS_URL} />
        </ActionPanel>
      }
    />
  );
}
