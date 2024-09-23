import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

export interface Preferences {
  email: string;
  publicKey: string;
  privateKey: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const preferencesString = `# Web Push Notification Preferences
    \n ### email:
   \`${preferences.email}\`
    \n ### publicKey:
   \`${preferences.publicKey}\`
   \n ### privateKey:
   \`${preferences.privateKey}\`
   \n ### auth:
   \`${preferences.auth}\`
   \n ### p256dh:
   \`${preferences.p256dh}\`
   \n ### endpoint:
   \`${preferences.endpoint}\`
  `;

  return (
    <Detail
      markdown={preferencesString}
      navigationTitle={"Web Push Notification Preferences"}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
