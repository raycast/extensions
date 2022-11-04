import { showToast, ActionPanel, Toast, Action, Detail, Icon, showHUD } from "@raycast/api";
import { copyPassword } from "./clipboard";

export function TroubleshootingGuide(): JSX.Element {
  showToast(Toast.Style.Failure, "Bitwarden CLI not found");
  const markdown = `# The Bitwarden CLI was not found
## Please check that:

1. The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
1. If you did not install bitwarden using brew, please check that path of the installation matches the \`Bitwarden CLI Installation Path\` extension setting
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Homebrew Installation Command"} content="brew install bitwarden-cli" />
          <Action.OpenInBrowser url="https://bitwarden.com/help/article/cli/#download-and-install" />
        </ActionPanel>
      }
    />
  );
}

export function CopyPasswordToClipboardAction(props: { title: string; content: string }): JSX.Element {
  async function doCopy() {
    const copiedSecurely = await copyPassword(props.content);
    showHUD(copiedSecurely ? "Copied password to clipboard" : "Copied to clipboard");
  }

  return <Action title={props.title} icon={Icon.CopyClipboard} onAction={doCopy}></Action>;
}
