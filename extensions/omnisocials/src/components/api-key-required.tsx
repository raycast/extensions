import {
  Detail,
  ActionPanel,
  Action,
  openExtensionPreferences,
} from "@raycast/api";

export function ApiKeyRequiredView() {
  return (
    <Detail
      markdown={`# Welcome to OmniSocials

To get started, you need to connect your OmniSocials account:

## Quick Setup
1. Go to [app.omnisocials.com](https://app.omnisocials.com) and sign in
2. Navigate to **Settings > API** and create a new API key
3. Come back here and press **Enter** to open preferences
4. Paste your API key

## Multiple Workspaces
If you manage multiple workspaces, use the **Manage Workspaces** command in Raycast to add a separate API key for each one.

Need help? Visit [docs.omnisocials.com](https://docs.omnisocials.com)`}
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
