import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function Unauthorized() {
  return (
    <Detail
      markdown={`# Authorization Needed

This extension now uses Oura OAuth (client ID + client secret).

Make sure your Oura app has a Redirect URI set to:
\`https://raycast.com/redirect?packageName=Extension\`

Then enter your credentials in the extension preferences and try again.
`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
