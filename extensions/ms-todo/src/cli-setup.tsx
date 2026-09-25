import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { type ReactNode, useState } from "react";
import { CliError, findCli } from "./cli";
import { literalMarkdown } from "./task-display";

const installCommand = "brew install planetaryescape/ms-todo/ms-todo";

export function CliSetup({ children }: { children: ReactNode }) {
  const { cliPath } = getPreferenceValues<Preferences>();
  const [, setRevision] = useState(0);
  let cliError: string | undefined;
  try {
    findCli(cliPath);
  } catch (cause) {
    cliError = cause instanceof CliError ? cause.message : String(cause);
  }

  if (!cliError) return <>{children}</>;

  return (
    <Detail
      markdown={`# Set up ms-todo

${literalMarkdown(cliError)}

1. Install the CLI with Homebrew:

   \`\`\`sh
   ${installCommand}
   \`\`\`

2. In Terminal, sign in and wait for the first sync:

   \`\`\`sh
   ms-todo auth login
   ms-todo sync --wait
   \`\`\`

3. If Raycast still cannot find the CLI, set **ms-todo CLI Path** in this extension's preferences to its absolute executable path (for example, \`/opt/homebrew/bin/ms-todo\`). Then retry.`}
      actions={
        <ActionPanel>
          <Action
            title="Retry CLI Detection"
            icon={Icon.ArrowClockwise}
            onAction={() => setRevision((value) => value + 1)}
          />
          <Action.CopyToClipboard
            title="Copy Homebrew Install Command"
            content={installCommand}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
