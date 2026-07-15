import { List, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { SUPPORTED_LOCKDOCK_MAJOR_VERSION } from "../lib/lockdock";
import { runInTerminal } from "../lib/terminal";

const LOCKDOCK_GITHUB = "https://github.com/mishamyrt/lockdock";
const BREW_COMMAND = "lockdock disable && brew upgrade mishamyrt/tap/lockdock && lockdock enable";
const SCRIPT_COMMAND =
  "lockdock disable && curl -fsSL https://raw.githubusercontent.com/mishamyrt/lockdock/main/install.sh | bash -s -- --enable-service";

type UpdateCommand = typeof BREW_COMMAND | typeof SCRIPT_COMMAND;

function updateLockdock(cmd: UpdateCommand) {
  runInTerminal(cmd);
  popToRoot();
}

export function LockdockNeedsUpdate({ version }: { version: string }) {
  return (
    <List>
      <List.EmptyView
        title="Lockdock Update Required"
        description={`Installed lockdock ${version} is not compatible with this extension. Install lockdock ${SUPPORTED_LOCKDOCK_MAJOR_VERSION}.x.x to continue.`}
        icon={Icon.Download}
        actions={
          <ActionPanel>
            <Action
              title="Update with Homebrew (Terminal)"
              icon={Icon.Terminal}
              onAction={() => updateLockdock(BREW_COMMAND)}
            />
            <Action
              title="Update with Script (Terminal)"
              icon={Icon.Terminal}
              onAction={() => updateLockdock(SCRIPT_COMMAND)}
            />
            <Action.OpenInBrowser title="Open Lockdock on GitHub" icon={Icon.Globe} url={LOCKDOCK_GITHUB} />
          </ActionPanel>
        }
      />
    </List>
  );
}
