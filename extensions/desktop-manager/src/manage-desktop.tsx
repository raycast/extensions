import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { PathLike } from "fs";
import { useState } from "react";
import { desktopFolder, getDesktopFiles, withAccessToDesktopFolder } from "./utils";

function Command() {
  const [desktopFiles, setDesktopFiles] = useState(getDesktopFiles());

  function handleTrash(paths: PathLike | PathLike[]) {
    setDesktopFiles((files) =>
      files.filter((file) => (Array.isArray(paths) ? !paths.includes(file.path) : paths !== file.path)),
    );
  }

  function handleReload() {
    setDesktopFiles(getDesktopFiles());
  }

  return (
    <List>
      {desktopFiles.length === 0 && (
        <List.EmptyView
          icon={{ fileIcon: desktopFolder }}
          title="No files found on desktop"
          description="Your desktop appears to be empty ¯\_(ツ)_/¯"
        />
      )}

      {desktopFiles.map((file) => (
        <List.Item
          key={file.path}
          title={file.file}
          icon={{ fileIcon: file.path }}
          quickLook={{ path: file.path, name: file.file }}
          accessories={[
            {
              date: file.lastModifiedAt,
              tooltip: `Last modified: ${file.lastModifiedAt.toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Open title="Open File" target={file.path} />
                <Action.ShowInFinder path={file.path} />
                <Action.CopyToClipboard
                  title="Copy File"
                  content={{ file: file.path }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Reload Desktop"
                  icon={Icon.RotateAntiClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={handleReload}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenWith path={file.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Trash
                  title="Delete File"
                  paths={file.path}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onTrash={handleTrash}
                />
                <Action.Trash
                  title="Delete All Desktop Files"
                  paths={desktopFiles.map((f) => f.path)}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onTrash={handleTrash}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToDesktopFolder(Command);
