import { ActionPanel, Action, Icon, Color, List, confirmAlert, Alert, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import os from "os";
import { createRaySoLink, getHistory, restoreHistory, saveFile } from "./utils";

let history: string[] = [];

export default function Command() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [loading]);

  history = getHistory();

  const length = history.length;

  if (length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "https://placekitten.com/500/500" }}
          title="You have no history. Run some commands to see them here."
          actions={
            <ActionPanel>
              <RestoreHistoryPanel />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Filter commands by name...">
      {history.reverse().map((command, index) => (
        <List.Item
          key={index}
          title={`${command}`}
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          accessories={[{ text: { value: `${length - index + 1}`, color: Color.PrimaryText } }]}
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
                  content={createRaySoLink(command)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Ray.so"
                  url={createRaySoLink(command)}
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
        saveFile();
        // Check if path exists for zsh or bash
        if (os.userInfo().shell === "/bin/zsh") {
          execSync("rm ~/.zsh_history");
        } else if (os.userInfo().shell === "/bin/bash") {
          execSync("rm ~/.bash_history");
        } else {
          console.log("Shell not supported");
          showHUD("Shell not supported");
          return;
        }
        execSync("history -c");
        setLoading(true);
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
        restoreHistory();
        setLoading(true);
      }
    });
  }

  // The restore history panel
  function RestoreHistoryPanel() {
    return (
      <Action
        title="Restore"
        icon={{ source: Icon.Redo }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={onRestorePressed}
      />
    );
  }
}
