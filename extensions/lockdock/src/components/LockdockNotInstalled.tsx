import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { runInTerminal } from "../lib/terminal";

const LOCKDOCK_GITHUB = "https://github.com/mishamyrt/lockdock";
const BREW_COMMAND = "brew install mishamyrt/tap/lockdock && lockdock enable";
const SCRIPT_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/mishamyrt/lockdock/main/install.sh | bash -s -- --enable-service";

export function LockdockNotInstalled() {
  return (
    <List>
      <List.EmptyView
        title="Lockdock Not Installed"
        description="Lockdock app is required to use this extension. Choose an install method below."
        icon={Icon.Download}
        actions={
          <ActionPanel>
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
            <Action.OpenInBrowser
              title="Open Lockdock on GitHub"
              icon={Icon.Globe}
              url={LOCKDOCK_GITHUB}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
