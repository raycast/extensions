import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const INSTRUCTIONS = `
# You will need the following to run the extension

## 🔐 Get API Key and Account ID from Mailtrap

1. Go to [Mailtrap](https://mailtrap.io/home)
2. Select your account in the top right corner and click on My Profile
3. Press the Copy button on the right of API Token to grab your API Token
4. Go to Settings in the left side navigation menu
5. Account ID will be present on the page

`;

export default function GuideView() {
  return (
    <Detail
      markdown={INSTRUCTIONS}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
