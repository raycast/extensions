import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import resetCache from "../../reset-cache";

const INSTRUCTION = `
## ✅ Spotlight and 3rd party app integrations is not enabled

### To use this extension please enable the "Spotlight and 3rd party app integrations" in the 1Password 7 app:
1. Make sure you have the right 1Password app version, it should be 7.
2. Open and unlock 1Password.
3. Choose 1Password > Preferences and click the Advanced icon.
4. Turn on “Enable Spotlight and 3rd party app integrations”.
5. Restart 1Password app.

### This extension has no access to your passwords, only to the metadata:
- title
- description
- URLs
- vault name
- item category
- account name
- vault identifier
- item identifier
`;

export function Guide() {
  return (
    <Detail
      markdown={INSTRUCTION}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action title="Reset Cache" icon={Icon.Trash} onAction={() => resetCache()}></Action>
        </ActionPanel>
      }
    />
  );
}
