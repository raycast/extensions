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

## Quick Setup Guide

### Step 1: Test ccusage locally
Open Terminal and run:
\`\`\`bash
npx ccusage@latest
\`\`\`

### Step 2: If it works, find your npx path
\`\`\`bash
which npx
# Example output: /usr/local/bin/npx
\`\`\`

### Step 3: Add path to preferences
1. Press **Cmd+Shift+,** or use the action below to open extension preferences
2. Copy the output from "which npx" command
3. Paste it into the "Custom npx Path" field in preferences

### If Step 1 doesn't work
The extension uses npx to run ccusage, so no installation is required. 
If the command fails, check your internet connection or try again later.

## 📚 Help & Resources
- [Claude Code Usage Raycast Extension](https://www.raycast.com/nyatinte/ccusage)
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
