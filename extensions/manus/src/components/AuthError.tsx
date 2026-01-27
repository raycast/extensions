import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

const markdown = `
# Invalid API Key

Your Manus API key is invalid or has expired.

Please update your API key in the extension preferences.

You can get your API key from [Manus Settings](https://manus.im/app#settings/integrations/api).
`;

export function AuthError() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
