import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getFileSize, RenameForm, deleteFile, handleSetWallpaper, isImageFile } from "../utils";
import { FileDataType } from "../types";

export function FileItem(props: {
  fileData: FileDataType;
  refresh: () => void;
  isSymlink?: boolean;
  originalPath?: string;
  preferences: Preferences;
}) {
  const isSymlink = props.isSymlink ?? false;
  const originalPath = props.originalPath ?? "";
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const typeName = `${isSymlink ? "Symlink " : ""}File`;

  return (
    <List.Item
      key={filePath}
      id={filePath}
      title={props.fileData.name}
      icon={{ fileIcon: filePath }}
      quickLook={{ path: filePath, name: props.fileData.name }}
      subtitle={props.preferences.showFilePermissions ? props.fileData.permissions : ""}
      keywords={props.preferences.searchByPermissions ? [props.fileData.permissions] : undefined}
      accessories={
        props.preferences.showFileSize
          ? [
              {
                icon: Icon.HardDrive,
                text: getFileSize(props.fileData),
              },
            ]
          : []
      }
      actions={
        <ActionPanel title={props.fileData.name}>
          <ActionPanel.Section>
            <Action.Open title={`Open ${typeName}`} target={filePath} />
            <Action.OpenWith path={filePath} />
            <Action.ShowInFinder path={filePath} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
            {isImageFile(props.fileData) && (
              <Action
                title="Set as Wallpaper"
                icon={Icon.Desktop}
                onAction={() => handleSetWallpaper(filePath)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              />
            )}
            <Action.CopyToClipboard
              title={`Copy ${typeName} Path`}
              content={filePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {isSymlink && (
              <Action.CopyToClipboard
                title={`Copy Original File Path`}
                content={originalPath}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              target={<RenameForm filePath={filePath} refresh={props.refresh} typeName={typeName} />}
              title={`RenameForm ${typeName}`}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.Trash
              title="Move to Trash"
              shortcut={
                props.preferences.standardShortcuts
                  ? { modifiers: ["ctrl"], key: "x" }
                  : { modifiers: ["cmd"], key: "t" }
              }
              paths={filePath}
              onTrash={() => {
                showToast(Toast.Style.Success, "Moved to Trash", `File: ${filePath}`);
                props.refresh();
              }}
            />
            {props.preferences.showDeleteActions && (
              <Action
                title={`Delete ${typeName}`}
                icon={Icon.Eraser}
                style={Action.Style.Destructive}
                shortcut={
                  props.preferences.standardShortcuts
                    ? { modifiers: ["ctrl", "shift"], key: "x" }
                    : { modifiers: ["cmd"], key: "d" }
                }
                onAction={() => deleteFile(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
