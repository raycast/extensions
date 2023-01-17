import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

const INSTRUCTION = `
## ✅ 1Password CLI 2

### You can install it on Mac using brew or manually download and extract it. If you installed it manually you have to specify the installation path in the extension preference section.

1. [Download 1Password CLI for your platform and architecture](https://app-updates.agilebits.com/product_history/CLI2). You can [verify its authenticity](https://developer.1password.com/docs/cli/verify).
2. Install 1Password CLI in the default location: \`/usr/local/bin\`.
3. To verify the installation, check the version number: \`op --version\`

## ✅ Enable Command-Line Interface (CLI)

### To turn on the app integration and set up 1Password to authenticate with biometrics:
1. Open 1Password.
2. Select the account or collection at the top of the sidebar and choose Preferences > Security.
3. Check [Touch ID](https://support.1password.com/touch-id-mac/).
4. Select Developer in the sidebar.
5. Check "Connect with 1Password CLI".

You can also unlock 1Password CLI with your [Apple Watch](https://support.1password.com/apple-watch-mac/).
`;

const V7_INSTRUCTION = `
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
      markdown={getPreferenceValues().version == "v8" ? INSTRUCTION : V7_INSTRUCTION}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
