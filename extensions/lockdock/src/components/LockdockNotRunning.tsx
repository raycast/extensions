import { List, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { runInTerminal } from "../lib/terminal";

function enableDaemon(binPath: string) {
  runInTerminal(`${binPath} enable`);
  popToRoot();
}

export function LockdockNotRunning({ binPath }: { binPath: string }) {
  return (
    <List>
      <List.EmptyView
        title="Lockdock Not Running"
        description="Lockdock daemon is required to use this extension"
        icon={Icon.Play}
        actions={
          <ActionPanel>
            <Action title="Enable Daemon" icon={Icon.Terminal} onAction={() => enableDaemon(binPath)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
