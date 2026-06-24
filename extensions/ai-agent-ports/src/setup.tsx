import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { PORTS_INSTALL_COMMAND, PORTS_WEBSITE } from "./ports";

/** Full-screen setup guide shown in `view` commands when the `ports` CLI is missing. */
export function SetupGuide({
  searchedPath,
  onRetry,
}: {
  searchedPath?: string;
  onRetry: () => void;
}) {
  const markdown = `# Install the \`ports\` CLI

This extension is a companion for the **ports** CLI by [portscli.com](${PORTS_WEBSITE}) — and it isn't installed yet${
    searchedPath ? ` (looked at \`${searchedPath}\`)` : ""
  }.

## 1 · Install it

\`\`\`sh
${PORTS_INSTALL_COMMAND}
\`\`\`

Prefer npm, Go, or a direct download? See [portscli.com](${PORTS_WEBSITE}).

## 2 · Come back

Once it's installed, press **⌘R** to retry.

---

**Already installed in a custom location?** Open Extension Preferences and set the full path to the \`ports\` binary.
`;

  return (
    <Detail
      navigationTitle="Setup — ports CLI"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Install Command"
            icon={Icon.Clipboard}
            content={PORTS_INSTALL_COMMAND}
          />
          <Action.OpenInBrowser title="Open portscli.com" url={PORTS_WEBSITE} />
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRetry}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
