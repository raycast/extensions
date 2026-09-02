import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { MINIMUM_RUNPOOL } from "../lib/runpool";

/** What is missing. Each has one command that fixes it. */
export type Requirement = "runpool" | "runpool-outdated" | "gh" | "gh-auth";

const INSTALL_RUNPOOL = "brew install aicayzer/tap/runpool";
const UPGRADE_RUNPOOL = "brew upgrade runpool";
const INSTALL_GH = "brew install gh";
const AUTH_GH = "gh auth login";

const SCREENS: Record<Requirement, { title: string; command: string; markdown: string }> = {
  runpool: {
    title: "runpool Not Found",
    command: INSTALL_RUNPOOL,
    markdown: `# runpool is not installed

This extension drives the \`runpool\` command line tool, which manages self-hosted GitHub Actions runner pools on your Mac.

## Install it

\`\`\`bash
${INSTALL_RUNPOOL}
\`\`\`

Then authenticate the GitHub CLI and create a pool:

\`\`\`bash
${INSTALL_GH}
${AUTH_GH}
runpool register my-pool --repo OWNER/REPO
runpool schedule install
\`\`\`

## Already installed?

If it lives somewhere unusual, set the full path in this extension's preferences.
`,
  },

  "runpool-outdated": {
    title: "runpool Is Too Old",
    command: UPGRADE_RUNPOOL,
    markdown: `# runpool needs to be ${MINIMUM_RUNPOOL} or newer

## Upgrade it

\`\`\`bash
${UPGRADE_RUNPOOL}
\`\`\`

## Why this is a refusal rather than a warning

Changing a pool's runner count writes an absolute number, so every capacity action here decides what to write from the count it just read. \`runpool ${MINIMUM_RUNPOOL}\` added \`--if-count\`, which refuses the write unless the pool is still where that decision was made.

Older versions do not reject the flag. They ignore it. A resize would look guarded and would not be, and a pool changed from another window in the meantime gets shrunk by an action meant to grow it, deregistering runners that setting the number back does not restore.
`,
  },

  gh: {
    title: "GitHub CLI Not Found",
    command: INSTALL_GH,
    markdown: `# The GitHub CLI is not installed

RunPool needs an authenticated [\`gh\`](https://cli.github.com). It is not optional: \`runpool\` registers and deregisters runners through it, and this extension reads workflow history through it.

## Install it

\`\`\`bash
${INSTALL_GH}
${AUTH_GH}
\`\`\`

## What stops working without it

Runner pools still list and still start and stop, because that is all local. What cannot happen is anything that asks GitHub a question, which includes the check that a pool's runners are still registered. A pool whose registrations GitHub has pruned looks perfectly healthy from this machine while every job queued against it waits forever.
`,
  },

  "gh-auth": {
    title: "GitHub CLI Not Signed In",
    command: AUTH_GH,
    markdown: `# The GitHub CLI is not signed in

\`gh\` is installed but has no usable credentials, so every request to GitHub is refused.

## Sign in

\`\`\`bash
${AUTH_GH}
\`\`\`

Then run \`runpool doctor\`, which checks the authentication along with the registrations and the background agents, and tells you what to do about anything it finds.
`,
  },
};

/**
 * Shown when a dependency is missing, in place of the command's own view.
 *
 * A full screen rather than a failure toast, deliberately. Neither tool is
 * something most machines have, so "not installed" is an ordinary first-run
 * state rather than an error, and it deserves an answer rather than a red
 * banner that disappears.
 */
export function Requirements({ missing, onRecheck }: { missing: Requirement; onRecheck?: () => void }) {
  const screen = SCREENS[missing];
  const isRunpool = missing === "runpool" || missing === "runpool-outdated";

  return (
    <Detail
      navigationTitle={screen.title}
      markdown={screen.markdown}
      actions={
        <ActionPanel>
          {/* First, because by the time anyone is reading this screen a second
              time they have gone and fixed the thing. Without a way back the
              command sits here until it is relaunched, since nothing else
              re-runs the lookup. */}
          {onRecheck && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRecheck} />}
          <Action.CopyToClipboard title="Copy Command" content={screen.command} icon={Icon.Clipboard} />
          <Action.OpenInBrowser
            title={isRunpool ? "Open Runpool on GitHub" : "Open GitHub CLI Website"}
            url={isRunpool ? "https://github.com/aicayzer/runpool" : "https://cli.github.com"}
          />
          {isRunpool && (
            // No shortcut: cmd+, is reserved by Raycast for preferences and
            // would be ignored anyway.
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
    />
  );
}
