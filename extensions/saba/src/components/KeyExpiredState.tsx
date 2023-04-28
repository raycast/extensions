import { Icon, openExtensionPreferences } from "@raycast/api";
import { GuardDetails } from "./GuardDetails";

export const KeyExpiredState = () => {
  const markdown = `
  ## Looks like your access key has expired 💩

  1. Please request a new access key from our [discord server](https://discord.gg/34aBGqXD8N).
  2. Replace the access key in the extension preferences with the new key.
  3. Re-launch the extension.
  `;

  return (
    <GuardDetails
      title="Open Extension Preferences"
      icon={Icon.WrenchScrewdriver}
      markdown={markdown}
      onAction={openExtensionPreferences}
    />
  );
};
