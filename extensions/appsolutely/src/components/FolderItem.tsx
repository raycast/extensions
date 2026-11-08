import { Action, ActionPanel, Alert, Color, confirmAlert, Grid, Icon, Keyboard, List } from "@raycast/api";
import type { Folder } from "../models/folder";
import { useLauncherState } from "../hooks/useLauncherState";
import { useFolderPreview } from "../hooks/useFolderPreview";
import { deleteFolder } from "../utils/hierarchy";
import { AppBrowser } from "./AppBrowser";
import { FolderForm } from "./FolderForm";
import { FolderPicker } from "./FolderPicker";
import { GlobalActions } from "./GlobalActions";
import { perform } from "./feedback";
import type { ViewMode } from "../services/view-preference";

export function FolderItem({
  folder,
  parentId,
  viewMode,
}: {
  folder: Folder;
  parentId: string | null;
  viewMode: ViewMode;
}) {
  const { update } = useLauncherState();
  const preview = useFolderPreview(folder.id, viewMode === "grid-large");

  async function remove() {
    if (
      await confirmAlert({
        title: `Delete “${folder.name}”?`,
        message:
          "This folder and its subfolders will be removed. All their apps return to Home. No apps are uninstalled.",
        primaryAction: { title: "Delete Folder", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await perform("Could Not Delete Folder", () => update((s) => deleteFolder(s, folder.id)));
    }
  }

  const actions = (
    <ActionPanel title={folder.name}>
      <Action.Push title="Open Folder" icon={Icon.Folder} target={<AppBrowser folderId={folder.id} />} />
      <ActionPanel.Section title="Organize">
        <Action.Push title="Create Subfolder" icon={Icon.NewFolder} target={<FolderForm parentId={folder.id} />} />
        <Action.Push
          title="Rename Folder"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<FolderForm parentId={folder.parentId} folder={folder} />}
        />
        <Action.Push
          title="Move Folder"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          target={<FolderPicker folderId={folder.id} />}
        />
        <Action
          title="Delete Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={remove}
        />
      </ActionPanel.Section>
      <GlobalActions folderId={parentId} />
    </ActionPanel>
  );
  return viewMode === "list" ? (
    <List.Item
      id={`folder:${folder.id}`}
      title={folder.name}
      icon={{ source: Icon.Folder, tintColor: Color.Blue }}
      actions={actions}
    />
  ) : (
    <Grid.Item
      id={`folder:${folder.id}`}
      content={{
        value: preview ? { source: preview } : { source: Icon.Folder, tintColor: Color.Blue },
        tooltip: folder.name,
      }}
      actions={actions}
    />
  );
}
