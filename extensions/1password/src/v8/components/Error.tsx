import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import resetCache from "../../reset-cache";
import { CLI_PATH, ZSH_PATH } from "../utils";

const ERROR = `
${CLI_PATH ? "" : `# 1Password CLI Tool Not Configured or Installed Properly`}
${ZSH_PATH ? "" : `# Zsh Shell Not Configured or Installed Properly`}

${
  CLI_PATH
    ? ""
    : `
-  Ensure that the 1Password CLI is installed on your system. You can download it from [official 1Password CLI website](https://developer.1password.com/docs/cli/get-started).
-  Check if the path to the 1Password CLI is correctly added to your system's environment variables.
-  Run \`op --version\` to verify that the 1Password CLI is correctly installed.
`
}


${
  ZSH_PATH
    ? ""
    : `
-  Make sure that Zsh is installed by running \`zsh --version\` in your terminal.
-  Review your \`.zshrc\` file for any incorrect configurations that might be causing issues.
-  Review your extension preferences for the Zsh shell path.
`
}

### Need More Help?
If you continue to experience problems after following these steps, please reach out by opening an issue in our [Github](https://github.com/raycast/extensions/issues/new/choose)

We're here to help ensure a smooth setup process!

---`;

export function Error() {
  return (
    <Detail
      markdown={ERROR}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.Open title="Open 1Password Settings" target="onepassword://settings" />
          <Action title="Reset Cache" icon={Icon.Trash} onAction={() => resetCache()}></Action>
        </ActionPanel>
      }
    />
  );
}
