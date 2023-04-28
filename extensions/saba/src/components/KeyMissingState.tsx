import { Icon, openExtensionPreferences } from "@raycast/api";
import { GuardDetails } from "./GuardDetails";

export const KeyMissingState = () => {
  const markdown = `
  ## The access key you have provided does not exist 👀

  1. Open extension preferences.
  2. Confirm that you have entered your access key correctly.
  3. Re-launch the extension.
  `;

  return (
    <GuardDetails
      title="Open Extension Preferences"
      markdown={markdown}
      onAction={openExtensionPreferences}
      icon={Icon.WrenchScrewdriver}
    />
  );
};
