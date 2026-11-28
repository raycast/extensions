import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const INSTALL_COMMAND = "curl https://mise.run | sh";
const DOCS_URL = "https://mise.jdx.dev/getting-started.html";

export function MissingMise({ searched }: { searched: string[] }) {
  const markdown = [
    "# mise was not found",
    "",
    "Raycast could not find the `mise` binary. Searched:",
    "",
    ...searched.map((path) => `- \`${path}\``),
    "",
    "Install it with:",
    "",
    "```sh",
    INSTALL_COMMAND,
    "```",
    "",
    "If mise is installed somewhere else, set its path in the extension preferences.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
          <Action.OpenInBrowser title="Open Getting Started" url={DOCS_URL} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
