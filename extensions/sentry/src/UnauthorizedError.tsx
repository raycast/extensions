import { Action, ActionPanel, Detail, Icon, openCommandPreferences } from "@raycast/api";
import { getDefaultBaseUrl } from "./utils";

export function UnauthorizedError() {
  const baseUrl = getDefaultBaseUrl();
  const markdown = `
  # Unauthorized

  The extension needs an Auth Token to communicate with the Sentry API. Please follow these steps to set it up properly:

  1. Open ${baseUrl}/settings/account/api/auth-tokens/
  2. Click the "Create New Token" button in the top right corner
  3. Select at least the "event:write", "project:read", and "org:read" scopes
  4. Press the "Create Token" button in the bottom right corner
  5. Copy your new token and paste it into Raycast's required preference item of the extension
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Sentry Settings" url={`${baseUrl}/settings/account/api/auth-tokens/`} />
          <Action icon={Icon.Gear} title="Open Command Settings" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
