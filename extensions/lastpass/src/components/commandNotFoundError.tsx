import { ActionPanel, Action, Detail } from "@raycast/api";

export const CommandNotFoundError = () => (
  <Detail
    markdown={[
      "# LastPass CLI is missing!",
      "Please make sure that",
      "",
      "1. LastPass cli is [correctly installed](https://github.com/lastpass/lastpass-cli#installing-on-os-x)",
      "2. Command `zsh -l -c 'lpass status'` passes",
    ].join("\n")}
    actions={
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Homebrew Installation Command" content="brew install lastpass-cli" />
        <Action.OpenInBrowser url="https://github.com/lastpass/lastpass-cli#installing-on-os-x" />
      </ActionPanel>
    }
  />
);
