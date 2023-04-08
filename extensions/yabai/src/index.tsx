import { ActionPanel, Action, showToast, Toast, List, Icon, Detail, openExtensionPreferences } from "@raycast/api";

import { loadCommands, assertYabai, execCommand } from "./commands";

function runCommand(command: string) {
  const result = execCommand(command);
  if (result.error) {
    showToast(Toast.Style.Failure, "Command failed", result.detail);
  } else {
    showToast(Toast.Style.Success, "Command succeeded", result.detail);
  }
}

export default function Command() {
  const commands = loadCommands();

  const isYabaiInstalled = assertYabai();

  if (!isYabaiInstalled) {
    const errorMd = `# Yabai not found

    Yabai was not found at the path specified in the preferences. Please check your preferences and try again.
    If it is installed, you can set the path to the yabai binary in the preferences.
    Otherwise, you can install it with [Homebrew](https://brew.sh/):

    `;

    return (
      <Detail
        markdown={errorMd}
        actions={
          <ActionPanel>
            <Action key="open-preferences" title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List>
      <List.EmptyView
        title="No commands found"
        icon={{ source: "https://github.com/koekeishiya/yabai/blob/master/assets/icon/icon.png?raw=true" }}
        description="Check your preferences or clear the search"
      />
      {commands.map((command) => (
        <List.Item
          key={command.title}
          title={{
            tooltip: command.description,
            value: command.title,
          }}
          // one tag for each key in hotkey, so split at spaces
          accessories={command.key?.split(" ").map((key) => {
            return { tag: key };
          })}
          actions={
            <ActionPanel>
              <Action
                key="run"
                title="Run Command"
                onAction={() => runCommand(command.shellCommand)}
                icon={{ source: Icon.Play }}
              />
              <Action.CopyToClipboard key="copy" content={command.shellCommand} title="Copy Command" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
