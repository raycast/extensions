import { List, Icon, ActionPanel, Action, LaunchType, launchCommand, open, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

const MOLE_GITHUB = "https://github.com/tw93/Mole";
const BREW_COMMAND = "brew install mole";
const SCRIPT_COMMAND = "curl -fsSL https://raw.githubusercontent.com/tw93/mole/main/install.sh | bash";

function openInBrewExtension() {
  launchCommand({
    name: "search",
    type: LaunchType.UserInitiated,
    extensionName: "brew",
    ownerOrAuthorName: "nhojb",
    fallbackText: "mole",
  }).catch(() => {
    open("raycast://extensions/nhojb/brew/search?fallbackText=mole");
  });
}

type KnownInstallCommand = typeof BREW_COMMAND | typeof SCRIPT_COMMAND;

function runInTerminal(command: KnownInstallCommand) {
  const escaped = command.replace(/"/g, '\\"');
  execFile(
    "/usr/bin/osascript",
    ["-e", `tell application "Terminal" to do script "${escaped}"`, "-e", 'tell application "Terminal" to activate'],
    (err) => {
      if (err) {
        showToast({ style: Toast.Style.Failure, title: "Failed to open Terminal", message: err.message });
      }
    },
  );
}

export function MoleNotInstalled() {
  return (
    <List>
      <List.EmptyView
        title="Mole Not Installed"
        description="Mole CLI is required to use this extension. Choose an install method below."
        icon={Icon.Download}
        actions={
          <ActionPanel>
            <Action title="Install with Homebrew (Raycast)" icon={Icon.RaycastLogoNeg} onAction={openInBrewExtension} />
            <Action
              title="Install with Homebrew (Terminal)"
              icon={Icon.Terminal}
              onAction={() => runInTerminal(BREW_COMMAND)}
            />
            <Action
              title="Install with Script (Terminal)"
              icon={Icon.Terminal}
              onAction={() => runInTerminal(SCRIPT_COMMAND)}
            />
            <Action.OpenInBrowser title="Open Mole on GitHub" icon={Icon.Globe} url={MOLE_GITHUB} />
          </ActionPanel>
        }
      />
    </List>
  );
}
