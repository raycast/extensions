import { Action, ActionPanel, Icon, List, Toast, environment, popToRoot, showToast } from "@raycast/api";
import { RenameForm, deleteDirectory } from "../utils";
import { Directory } from "./directory";
import { FileDataType } from "../types";
import { GitIgnoreHelper } from "@gerhobbelt/gitignore-parser";

export function DirectoryItem(props: {
  fileData: FileDataType;
  refresh: () => void;
  isSymlink?: boolean;
  originalPath?: string;
  preferences: Preferences;
  ignores: GitIgnoreHelper[];
}) {
  const isSymlink = props.isSymlink ?? false;
  const originalPath = props.originalPath ?? "";
  const filePath = `${props.fileData.path}/${props.fileData.name}`;
  const typeName = `${isSymlink ? "Symlink " : ""}Directory`;

  const context = encodeURIComponent(JSON.stringify({ path: filePath }));
  const deeplink = `raycast://extensions/erics118/${environment.extensionName}/${environment.commandName}?context=${context}`;

  return (
    <List.Item
      id={filePath}
      title={props.fileData.name}
      subtitle={props.preferences.showFilePermissions ? props.fileData.permissions : ""}
      keywords={props.preferences.searchByPermissions ? [props.fileData.permissions] : undefined}
      icon={{ fileIcon: filePath }}
      quickLook={{ path: filePath, name: props.fileData.name }}
      actions={
        <ActionPanel title={props.fileData.name}>
          <ActionPanel.Section>
            <Action.Push
              title={`Open ${typeName}`}
              icon={Icon.ArrowRight}
              target={<Directory path={filePath} ignores={props.ignores} />}
            />
            <Action.OpenWith path={filePath} onOpen={() => popToRoot({ clearSearchBar: true })} />
            <Action.ShowInFinder path={filePath} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
            <Action.CopyToClipboard
              title={`Copy ${typeName} Path`}
              content={filePath + "/"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {isSymlink && (
              <Action.CopyToClipboard
                title={`Copy Original Directory Path`}
                content={originalPath}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CreateQuicklink
              title={`Create Quicklink to This ${typeName}`}
              quicklink={{ name: `Open ${filePath}`, link: deeplink }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              target={<RenameForm filePath={filePath} refresh={props.refresh} typeName={typeName} />}
              title={`RenameForm ${typeName}`}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.Pencil}
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
                showToast(Toast.Style.Success, "Moved to Trash", `${typeName}: ${filePath}`);
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
                onAction={() => deleteDirectory(filePath, props.fileData.name, props.refresh)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
