import { execSync } from "child_process";
import { ActionPanel, Action, Alert, Cache, Color, confirmAlert, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { shellHistory, shellHistoryPath } from "shell-history";

const backupLocation = "/tmp/terminal-history-backup.file.txt";
const cache = new Cache();
const pathKey = "shell-history-path";

export default function Command() {
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const path = shellHistoryPath();
    setHistory(path ? shellHistory() : []);
    setLoading(false);
  }, [isLoading]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter commands by name...">
      {history.reverse().map((command, index) => (
        <List.Item
          key={index}
          title={`${command}`}
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          accessories={[{ text: { value: `${history.length - index + 1} `, color: Color.PrimaryText } }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={command}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Ray.so link"
                  content={createLink(command)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Ray.so"
                  url={createLink(command)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Clear"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon={{ source: Icon.Trash }}
                  style={Action.Style.Destructive}
                  onAction={onDeletePressed}
                />
                <RestoreHistoryPanel />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={{ source: Icon.Terminal }}
        title="You have no history. Run some commands, here."
        actions={
          <ActionPanel>
            <RestoreHistoryPanel />
          </ActionPanel>
        }
      />
    </List>
  );

  /// On delete pressed action
  function onDeletePressed() {
    confirmAlert({
      title: `Are you sure you want to delete your history ? `,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    }).then((confirmed) => {
      if (confirmed) {
        save();

        const path = cache.get(pathKey);
        execSync(`rm ${path}`);
        setHistory([]);
      }
    });
  }

  /// On restore pressed action
  function onRestorePressed() {
    confirmAlert({
      title: `Would you like to restore your history ? `,
      primaryAction: {
        title: "Restore",
      },
    }).then((confirmed) => {
      if (confirmed) {
        restore();
        setLoading(true);
      }
    });
  }

  // The restore history panel
  function RestoreHistoryPanel() {
    return (
      cache.get(pathKey) && (
        <Action
          title="Restore"
          icon={{ source: Icon.Redo }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={onRestorePressed}
        />
      )
    );
  }
}

/// Restore the history file from a backup location
function restore() {
  const cachedPath = cache.get(pathKey);
  execSync(`cp ${backupLocation} ${cachedPath}`);
}

/// Save the history file to a backup location
function save() {
  const path = shellHistoryPath() ?? "";
  cache.set(pathKey, path);
  execSync(`cp ${path} ${backupLocation}`);
}
/// Create a ray.so link
/// - Parameter command: The command to encode
/// - Returns: A ray.so link
function createLink(command: string): string {
  try {
    // eslint-disable-next-line no-undef
    return `https://ray.so/#language=shell&code=${btoa(command)}`;
  } catch (error) {
    return "";
  }
}
