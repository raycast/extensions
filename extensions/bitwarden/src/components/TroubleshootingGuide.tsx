import { showToast, ActionPanel, Toast, Action, Detail } from "@raycast/api";

const CONTENT = `# The Bitwarden CLI was not found
## Please check that:

1. The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
1. If you did not install bitwarden using brew, please check that path of the installation matches the \`Bitwarden CLI Installation Path\` extension setting
`;

export function TroubleshootingGuide(): JSX.Element {
  showToast(Toast.Style.Failure, "Bitwarden CLI not found");

  return (
    <Detail
      markdown={CONTENT}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Homebrew Installation Command"} content="brew install bitwarden-cli" />
          <Action.OpenInBrowser url="https://bitwarden.com/help/article/cli/#download-and-install" />
        </ActionPanel>
      }
    />
  );
}
