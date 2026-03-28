import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { CLINotFoundError, AppNotRunningError } from "../lib/cli";

interface ErrorViewProps {
  error: Error;
}

function markdownForError(error: Error): string {
  if (error instanceof CLINotFoundError) {
    return `# BetterAudio CLI Not Found

The \`betteraudio\` CLI binary could not be located.

## How to fix

1. Open **BetterAudio** → **Settings** → **General** → **CLI**
2. Click **Install CLI**
3. Or set a custom path in this extension's preferences

The CLI is typically installed at \`/usr/local/bin/betteraudio\`.`;
  }

  if (error instanceof AppNotRunningError) {
    return `# BetterAudio Is Not Running

The BetterAudio app needs to be running for CLI commands to work.

Please launch **BetterAudio** and try again.`;
  }

  return `# Something Went Wrong

\`\`\`
${error.message}
\`\`\`

Please make sure BetterAudio is running and the CLI is installed.`;
}

export function ErrorView({ error }: ErrorViewProps) {
  return (
    <Detail
      markdown={markdownForError(error)}
      actions={
        <ActionPanel>
          <Action.Open
            title="Launch BetterAudio"
            target="/Applications/BetterAudio.app"
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
