import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

const markdown = `# WSL Not Found

Windows Subsystem for Linux (WSL) is not installed or not accessible from this user account.

## Install WSL

Open **PowerShell as Administrator** and run:

\`\`\`powershell
wsl --install
\`\`\`

Then restart your computer and try again.

## More Information

Visit the [Microsoft WSL documentation](https://learn.microsoft.com/en-us/windows/wsl/install) for full setup instructions.`;

export function WslNotInstalled() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Wsl Documentation"
            url="https://learn.microsoft.com/en-us/windows/wsl/install"
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content="wsl --install"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
