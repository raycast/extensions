import { Action, ActionPanel, Icon, List, LocalStorage, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import path from "path";
import { AddFolderForm, FolderConfig } from "./add-folder-form";
import { NodeModulesList } from "./node-modules-list";

export function FolderList() {
  const [folders, setFolders] = useState<FolderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    const foldersJson = await LocalStorage.getItem<string>("folders");
    const loadedFolders: FolderConfig[] = foldersJson ? JSON.parse(foldersJson) : [];
    setFolders(loadedFolders);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleFolderAdded = useCallback(() => {
    loadFolders();
  }, [loadFolders]);

  const handleDeleteFolder = useCallback(
    async (folder: FolderConfig) => {
      const hasConfirmed = await confirmAlert({
        title: "Remove this folder from the list?",
        message: folder.path,
        icon: Icon.Trash,
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Remove",
        },
      });

      if (!hasConfirmed) {
        return;
      }

      const updatedFolders = folders.filter((f) => f.id !== folder.id);
      await LocalStorage.setItem("folders", JSON.stringify(updatedFolders));
      setFolders(updatedFolders);

      await showToast({
        style: Toast.Style.Success,
        title: "Folder removed",
        message: path.basename(folder.path),
      });
    },
    [folders],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search folders..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Folder"
            icon={Icon.Plus}
            target={<AddFolderForm onFolderAdded={handleFolderAdded} />}
          />
        </ActionPanel>
      }
    >
      {folders.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Folders Added"
          description="Add a folder to start scanning for node_modules"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Folder"
                icon={Icon.Plus}
                target={<AddFolderForm onFolderAdded={handleFolderAdded} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        folders.map((folder) => (
          <List.Item
            key={folder.id}
            title={path.basename(folder.path)}
            subtitle={folder.path}
            accessories={[
              {
                tag: folder.useDeepScan ? "Unlimited" : `Depth: ${folder.scanDepth}`,
                tooltip: folder.useDeepScan
                  ? "Scans all subdirectories"
                  : `Scans up to ${folder.scanDepth} levels deep`,
              },
            ]}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Node Modules"
                  icon={Icon.Eye}
                  target={
                    <NodeModulesList
                      rootFolder={folder.path}
                      useDeepScan={folder.useDeepScan}
                      scanDepth={folder.scanDepth}
                    />
                  }
                />
                <Action.Push
                  title="Edit Folder"
                  icon={Icon.Pencil}
                  target={<AddFolderForm onFolderAdded={handleFolderAdded} existingFolder={folder} />}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "e" },
                    Windows: { modifiers: ["ctrl"], key: "e" },
                  }}
                />
                <Action.Push
                  title="Add Folder"
                  icon={Icon.Plus}
                  target={<AddFolderForm onFolderAdded={handleFolderAdded} />}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "n" },
                    Windows: { modifiers: ["ctrl"], key: "n" },
                  }}
                />
                <Action
                  title="Remove Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteFolder(folder)}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "backspace" },
                    Windows: { modifiers: ["ctrl"], key: "backspace" },
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
