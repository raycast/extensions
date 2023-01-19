import { Action, ActionPanel, Detail, Icon, environment, openExtensionPreferences } from "@raycast/api";
import { join } from "path";

const binary = join(environment.assetsPath, "binary-instruction.png");
const settings = join(environment.assetsPath, "1password-settings.png");

const INSTRUCTION = `
# You will need the following to run the extension

## ✅ 1Password CLI

### This extension utilizes the 1Password CLI tool and, it will be installed automatically when you run your first command. But in case there's an issue, check the following.
![Terminal Instruction](${binary})

## ✅ Enable Command-Line Interface (CLI)

### To turn on the app integration and set up 1Password to authenticate with biometrics:
![1Password Settings](${settings})

1. Open [1Password](onepassword://settings).
2. Select the account or collection at the top of the sidebar and choose Preferences > Security.
3. Check [Touch ID](https://support.1password.com/touch-id-mac/).
4. Select Developer in the sidebar.
5. Check "Connect with 1Password CLI".

You can also unlock 1Password CLI with your [Apple Watch](https://support.1password.com/apple-watch-mac/).
`;

export function Guide() {
  return (
    <Detail
      markdown={INSTRUCTION}
      actions={
        <ActionPanel>
          <Action.Open title="Open 1Password Settings" target="onepassword://settings" />
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
