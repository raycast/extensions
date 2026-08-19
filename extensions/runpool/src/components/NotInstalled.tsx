import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const INSTALL = "brew install aicayzer/tap/runpool";

/**
 * Shown when the executable cannot be found.
 *
 * A full screen rather than a failure toast, deliberately. runpool is not
 * something most machines have, so "not installed" is an ordinary first-run
 * state rather than an error, and it deserves an answer rather than a red
 * banner that disappears.
 */
export function NotInstalled() {
  return (
    <Detail
      navigationTitle="runpool Not Found"
      markdown={`# runpool is not installed

This extension drives the \`runpool\` command line tool, which manages self-hosted GitHub Actions runner pools on your Mac.

## Install it

\`\`\`bash
${INSTALL}
\`\`\`

Then authenticate the GitHub CLI and create a pool:

\`\`\`bash
gh auth login
runpool register my-pool --repo OWNER/REPO
runpool schedule install
\`\`\`

## Already installed?

If it lives somewhere unusual, set the full path in this extension's preferences.
`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Install Command" content={INSTALL} icon={Icon.Clipboard} />
          <Action.OpenInBrowser title="Open Runpool on GitHub" url="https://github.com/aicayzer/runpool" />
          {/* No shortcut: cmd+, is reserved by Raycast for preferences and
              would be ignored anyway. */}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
