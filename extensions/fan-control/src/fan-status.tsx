import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getFanStatus } from "./lib/smctl";

const SMCTL_RELEASE_URL = "https://github.com/leaperone/smctl/releases/latest";
const DAEMON_SETUP_COMMAND = "sudo smctl daemon install";

function statusMarkdown(status?: string, error?: Error): string {
  if (error) {
    return `# Fan backend unavailable

${error.message}

## One-time setup

1. Download the signed ARM64 release from [smctl releases](${SMCTL_RELEASE_URL}).
2. Install both \`smctl\` and \`smctld\` on your PATH.
3. Run:

\`\`\`sh
${DAEMON_SETUP_COMMAND}
\`\`\`

After setup, return here and press **⌘ R**.`;
  }

  return `# Current Fan Status

\`\`\`text
${status || "Loading fan data…"}
\`\`\`

Manual targets remain active until you choose **Automatic** or another profile.`;
}

export function FanStatus() {
  const { data, error, isLoading, revalidate } = usePromise(getFanStatus);

  return (
    <Detail
      isLoading={isLoading}
      markdown={statusMarkdown(data, error)}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.CopyToClipboard
            title="Copy Daemon Setup Command"
            content={DAEMON_SETUP_COMMAND}
            icon={Icon.Clipboard}
          />
          <Action.OpenInBrowser
            title="Download SMCTL"
            url={SMCTL_RELEASE_URL}
          />
        </ActionPanel>
      }
    />
  );
}
