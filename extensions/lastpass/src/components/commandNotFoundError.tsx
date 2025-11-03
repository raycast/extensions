import { ActionPanel, Action, Detail, environment } from "@raycast/api";

const isWindows = process.platform === "win32";

const getMarkdown = () => {
  if (isWindows) {
    return [
      "# LastPass CLI is missing!",
      "Please make sure that:",
      "",
      "1. LastPass CLI is correctly installed",
      "2. Install via [Chocolatey](https://chocolatey.org/): `choco install lastpass-cli`",
      "3. Or download from [LastPass CLI releases](https://github.com/lastpass/lastpass-cli/releases)",
      "4. Verify installation: `lpass --version`",
    ].join("\n");
  }

  return [
    "# LastPass CLI is missing!",
    "Please make sure that:",
    "",
    "1. LastPass CLI is [correctly installed](https://github.com/lastpass/lastpass-cli#installing-on-os-x)",
    "2. Install via Homebrew: `brew install lastpass-cli`",
    "3. Verify installation: `lpass --version`",
  ].join("\n");
};

const getActions = () => {
  if (isWindows) {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Chocolatey Installation Command" content="choco install lastpass-cli" />
        <Action.OpenInBrowser url="https://github.com/lastpass/lastpass-cli/releases" />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Homebrew Installation Command" content="brew install lastpass-cli" />
      <Action.OpenInBrowser url="https://github.com/lastpass/lastpass-cli#installing-on-os-x" />
    </ActionPanel>
  );
};

export const CommandNotFoundError = () => <Detail markdown={getMarkdown()} actions={getActions()} />;
