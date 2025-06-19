import { Detail, Icon, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";

type ErrorStateProps = {
  actions?: ReactNode;
};

export function ErrorState({ actions }: ErrorStateProps) {
  const markdown = `
# 🚨 ccusage Command Not Available

## Problem
The ccusage command cannot be executed. The Raycast extension is unable to retrieve Claude usage data.

## Solution

### 1. 🔧 Configure Custom npx Path (if needed)
If the automatic path detection doesn't work, you can set a custom npx path in preferences.

Press **Cmd+Shift+,** or use the action below to open extension preferences.

To find the correct npx path, run this command in Terminal:

\`\`\`bash
# Find npx location  
which npx
# Example output: /usr/local/bin/npx
\`\`\`

Copy the output path and paste it into the "Custom npx Path" field in preferences.

### 2. 🔄 Verify ccusage Access
The extension will automatically execute:
\`npx ccusage@latest --json\`

## 📚 Help & Resources
- [ccusage GitHub Repository](https://github.com/ryoppippi/ccusage)
- [Claude Code](https://claude.ai/code)

After configuration is complete, re-run the extension.
  `;

  const defaultActions = (
    <ActionPanel>
      <Action
        title="Open Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      />
      <Action.OpenInBrowser
        title="View Ccusage Repository"
        url="https://github.com/ryoppippi/ccusage"
        icon={Icon.Code}
      />
      <Action.OpenInBrowser title="Open Claude Code" url="https://claude.ai/code" icon={Icon.Globe} />
    </ActionPanel>
  );

  return <Detail markdown={markdown} actions={actions || defaultActions} />;
}
