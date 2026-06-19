import { ActionPanel, Action, Icon, List } from "@raycast/api";

export function WezTermNotFound() {
  return (
    <List.EmptyView
      icon={Icon.Terminal}
      title="WezTerm Not Found"
      description="WezTerm doesn't appear to be installed. Install it via Homebrew or download from wezfurlong.org/wezterm"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Wezterm" url="https://wezfurlong.org/wezterm/installation.html" />
          <Action.CopyToClipboard title="Copy Homebrew Install Command" content="brew install --cask wezterm" />
        </ActionPanel>
      }
    />
  );
}
