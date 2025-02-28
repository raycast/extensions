import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

interface LegacyPromptProps {
  onDismiss: () => void;
}

export default function LegacyPrompt({ onDismiss }: LegacyPromptProps) {
  return (
    <Detail
      markdown={`
# Legacy Authentication Detected

You are using legacy username/password authentication. This method will be deprecated in a future release.
Please consider switching to API Key authentication for better security and reliability.

You can skip this prompt and continue using legacy authentication, but it is recommended to switch to API Key authentication.

To get an API Key follow these instructions:
1. Visit your UniFi Network dashboard (normally: [https://192.168.1.1/network/default](https://192.168.1.1/network/default))
2. Go to Settings -> Admin & Users (under Control Plane, usually [https://192.168.1.1/network/default/settings/admins](https://192.168.1.1/network/default/settings/admins))
3. Find your admin user and click on it.
4. At the bottom of the panel that comes up, you should see a section called \`Control Plane API Key\`. Click \`Create New\`.
5. Name your key and click \`Create\`
6. You'll now have your API Key, save it somewhere secure as you wont be able to retrieve this one again.
7. Enter the key into the preferences for the extension!

      `}
      actions={
        <ActionPanel>
          <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
          <Action title="Continue with Legacy Auth" onAction={onDismiss} />
        </ActionPanel>
      }
    />
  );
}
