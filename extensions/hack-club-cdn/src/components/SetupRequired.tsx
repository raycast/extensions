import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

const MARKDOWN = `# Set Up Hack Club CDN

This extension needs an API token from the Hack Club CDN before it can upload anything.

## Steps

1. Go to **cdn.hackclub.com** and sign in with your Hack Club account.
2. Visit **cdn.hackclub.com/api_keys** and create a new API key. It's shown only once, so copy it.
3. Open this extension's preferences and paste the key into **API Token**.

Requires a Hack Club account. This service is for Hack Clubbers.
`;

export default function SetupRequired() {
  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get an API Key" url="https://cdn.hackclub.com/api_keys" />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
