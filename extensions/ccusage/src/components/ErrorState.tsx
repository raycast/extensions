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

### 1. ⚙️ Configure JavaScript Runtime in Preferences
Press **Cmd+Shift+,** or use the action below to open extension preferences.

Select one of the following JavaScript runtimes:
- **npx** (Recommended) - Node.js package runner
- **pnpm dlx** - pnpm package runner  
- **bunx** - Bun package runner
- **deno run** - Deno runtime

### 2. 🔧 Configure Custom Path (if needed)
If the automatic path detection doesn't work, you can set a custom path in preferences.

To find the correct path for your runtime, run these commands in Terminal:

\`\`\`bash
# For npx
which npx
# Example output: /usr/local/bin/npx

# For pnpm
which pnpm
# Example output: /opt/homebrew/bin/pnpm

# For bunx  
which bunx
# Example output: /Users/username/.bun/bin/bunx

# For deno
which deno
# Example output: /opt/homebrew/bin/deno
\`\`\`

Copy the output path and paste it into the "Custom Runtime Path" field in preferences.

### 3. 🔄 Verify ccusage Access
The extension will automatically use the configured runtime to execute:
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
