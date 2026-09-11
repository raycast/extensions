import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { PathLike } from "fs";
import { useState } from "react";
import {
  desktopFolder,
  getDesktopFiles,
  withAccessToDesktopFolder,
  deleteFileOrFolder,
  deleteMultipleFilesOrFolders,
} from "./utils";

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
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Reload Desktop"
                  icon={Icon.RotateAntiClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={handleReload}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenWith path={file.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete File"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const deleted = await deleteFileOrFolder(file.path);
                    if (deleted) {
                      handleTrash(file.path);
                    }
                  }}
                />
                <Action
                  title="Delete All Desktop Files"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={async () => {
                    const deleted = await deleteMultipleFilesOrFolders(desktopFiles.map((f) => f.path));
                    if (deleted) {
                      handleTrash(desktopFiles.map((f) => f.path));
                    }
                  }}
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
