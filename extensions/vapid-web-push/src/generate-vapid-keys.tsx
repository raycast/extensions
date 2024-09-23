import {
  getPreferenceValues,
  showHUD,
  Action,
  Detail,
  ActionPanel,
  openCommandPreferences,
} from "@raycast/api";
import webpush from "web-push";
import { Preferences } from "./setup";


async function generateVapidKeys() {
  const preferences = getPreferenceValues<Preferences>();
  const email = preferences.email;

  const vapidKeys = webpush.generateVAPIDKeys();

  const publicKey = vapidKeys.publicKey;
  const privateKey = vapidKeys.privateKey;

  const preferencesString = `# Web Push Notification Preferences
    \n ### email:
    \`${email}\`
    \n ### publicKey:
    \`${publicKey}\`
    \n ### privateKey:
    \`${privateKey}\`
  `;

  await showHUD("VAPID keys generated");

  return {
    preferences: {
      email,
      publicKey,
      privateKey,
    },
    preferencesString,
  };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const email = preferences.email;
  const vapidKeys = webpush.generateVAPIDKeys();
  const publicKey = vapidKeys.publicKey;
  const privateKey = vapidKeys.privateKey;

  const markdown = `# Generated VAPID Keys
  \n ### email:
  \`${email}\`
  \n ### publicKey:
  \`${publicKey}\`
  \n ### privateKey:
  \`${privateKey}\`
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={"Web Push Notification Preferences"}
      actions={
        <ActionPanel>
          <Action title="Open Command Preferences" onAction={openCommandPreferences} />

          <Action
            title={"Generate"}
            onAction={async () => {
              await generateVapidKeys();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
