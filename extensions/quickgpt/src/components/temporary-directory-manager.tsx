import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getSelectedFinderItems,
  Alert,
  confirmAlert,
  Color,
  closeMainWindow,
  openExtensionPreferences,
} from "@raycast/api";
import path from "path";
import fs from "fs";
import {
  getActiveTemporaryDirectories,
  getActiveTemporaryDirectoriesWithExpiry,
  addTemporaryDirectory,
  removeTemporaryDirectory,
  removeAllTemporaryDirectories,
  removeTemporaryDirectoryIfUnchanged,
  restoreTemporaryDirectories,
  type TemporaryDirectoryInfo,
} from "../stores/temporary-directory-store";
import promptManager from "../managers/prompt-manager";
import configurationManager from "../managers/configuration-manager";
import { normalizeEditorApp, openPathWithEditor } from "../utils/editor-launcher";

export type DirectoryManagerType = "temporary" | "scripts" | "prompts";

interface DirectoryManagerProps {
  type: DirectoryManagerType;
  onRefreshNeeded?: () => void;
}

interface DirectoryInfo {
  path: string;
  remainingText?: string;
  remainingMs?: number;
  addedAt?: number;
}

export function DirectoryManager({ type, onRefreshNeeded }: DirectoryManagerProps) {
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDirectories = () => {
    if (type === "temporary") {
      const tempDirs = getActiveTemporaryDirectoriesWithExpiry();
      setDirectories(
        tempDirs.map((dir) => ({
          path: dir.path,
          remainingText: dir.remainingText,
          remainingMs: dir.remainingMs,
          addedAt: dir.addedAt,
        })),
      );
    } else if (type === "scripts" || type === "prompts") {
      const dirs = configurationManager.getDirectories(type);
      setDirectories(dirs.map((dir) => ({ path: dir })));
    }
  };

  useEffect(() => {
    refreshDirectories();
    setIsLoading(false);

    if (type === "temporary") {
      const timer = setInterval(() => {
        refreshDirectories();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [type]);

  const handleOpenDirectory = async (dirPath: string) => {
    try {
      const editorApp = normalizeEditorApp(configurationManager.getPreference("customEditor"));
      await openPathWithEditor(editorApp, dirPath);
      await closeMainWindow();
    } catch (error) {
      console.error(`Failed to open directory ${dirPath}:`, error);
      await showToast({
        title: "Couldn't open directory",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  };

  const handleAddDirectory = async () => {
    if (type !== "temporary") return;

    let addedDirectory: TemporaryDirectoryInfo | undefined;
    let refreshCompleted = false;
    try {
      const selectedItems = await getSelectedFinderItems();
      if (selectedItems.length === 0) {
        await showToast({
          title: "No directory selected",
          message: "Select a folder in Finder first, then try again",
          style: Toast.Style.Failure,
        });
        return;
      }

      const selectedPath = selectedItems[0].path;
      const stats = fs.statSync(selectedPath);
      if (!stats.isDirectory()) {
        await showToast({
          title: "That's a file",
          message: "Select a folder instead",
          style: Toast.Style.Failure,
        });
        return;
      }

      addedDirectory = addTemporaryDirectory(selectedPath);
      await promptManager.reloadPrompts();
      refreshCompleted = true;
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
      refreshDirectories();

      await showToast({
        title: "Directory added",
        message: path.basename(selectedPath),
        style: Toast.Style.Success,
      });
    } catch (error) {
      if (addedDirectory && !refreshCompleted) {
        removeTemporaryDirectoryIfUnchanged(addedDirectory);
        refreshDirectories();
      }
      console.error("Failed to add temporary directory:", error);
      await showToast({
        title: "Couldn't add directory",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  };

  const handleRemoveDirectory = async (dirPath: string) => {
    if (type !== "temporary") return;

    const previousDirectories = getActiveTemporaryDirectories();
    const removedDirectory = previousDirectories.find((directory) => directory.path === dirPath);
    let refreshCompleted = false;
    try {
      removeTemporaryDirectory(dirPath);
      await promptManager.reloadPrompts();
      refreshCompleted = true;
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
      refreshDirectories();

      await showToast({
        title: "Directory removed",
        message: path.basename(dirPath),
        style: Toast.Style.Success,
      });
    } catch (error) {
      if (removedDirectory && !refreshCompleted) {
        restoreTemporaryDirectories([removedDirectory]);
        refreshDirectories();
      }
      console.error("Failed to remove temporary directory:", error);
      await showToast({
        title: "Couldn't remove directory",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  };

  const handleRemoveAll = async () => {
    if (type !== "temporary") return;

    let removedDirectories: TemporaryDirectoryInfo[] = [];
    let refreshCompleted = false;
    try {
      const confirmed = await confirmAlert({
        title: "Remove all temporary directories?",
        message: "This can't be undone. You can re-add them from Finder.",
        primaryAction: {
          title: "Remove All",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        removedDirectories = getActiveTemporaryDirectories();
        removeAllTemporaryDirectories();
        await promptManager.reloadPrompts();
        refreshCompleted = true;
        if (onRefreshNeeded) {
          onRefreshNeeded();
        }
        refreshDirectories();

        await showToast({
          title: "All directories removed",
          style: Toast.Style.Success,
        });
      }
    } catch (error) {
      if (!refreshCompleted) {
        restoreTemporaryDirectories(removedDirectories);
        refreshDirectories();
      }
      console.error("Failed to remove all temporary directories:", error);
      await showToast({
        title: "Couldn't remove directories",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  };

  const getNavigationTitle = () => {
    switch (type) {
      case "temporary":
        return "Manage Temporary Directories";
      case "scripts":
        return "Scripts Directories";
      case "prompts":
        return "Prompts Directories";
    }
  };

  const getEmptyTitle = () => {
    switch (type) {
      case "temporary":
        return "No temporary directories";
      case "scripts":
        return "No scripts directories";
      case "prompts":
        return "No prompts directories";
    }
  };

  const getEmptyDescription = () => {
    switch (type) {
      case "temporary":
        return "Select a folder in Finder, then press ↵ to add it";
      case "scripts":
        return "Set up a scripts folder in extension preferences";
      case "prompts":
        return "Set up a prompts folder in extension preferences";
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={getNavigationTitle()}
      searchBarPlaceholder={`Filter ${type} directories…`}
    >
      {directories.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={getEmptyTitle()}
          description={getEmptyDescription()}
          actions={
            <ActionPanel>
              {type === "temporary" ? (
                <Action title="Add Temporary Directory from Finder" icon={Icon.Plus} onAction={handleAddDirectory} />
              ) : (
                <Action
                  title="Configure"
                  icon={Icon.Gear}
                  onAction={() => {
                    openExtensionPreferences();
                    closeMainWindow();
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {directories.map((dir) => {
            const accessories: List.Item.Accessory[] = [];
            if (type === "temporary" && dir.remainingText && dir.remainingMs !== undefined) {
              accessories.push({
                tag: {
                  value: dir.remainingText,
                  color: dir.remainingMs < 3600000 ? Color.Red : Color.SecondaryText,
                },
              });
              if (dir.addedAt) {
                accessories.push({
                  icon: Icon.Clock,
                  tooltip: `Added: ${new Date(dir.addedAt).toLocaleString()}`,
                });
              }
            }

            return (
              <List.Item
                key={dir.path}
                title={path.basename(dir.path)}
                subtitle={dir.path}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    {type === "temporary" ? (
                      <>
                        <Action
                          title="Remove"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleRemoveDirectory(dir.path)}
                        />
                        <Action
                          title="Add New Directory from Finder"
                          icon={Icon.Plus}
                          onAction={handleAddDirectory}
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                        />
                        {directories.length > 1 && (
                          <Action
                            title="Remove All"
                            icon={Icon.DeleteDocument}
                            style={Action.Style.Destructive}
                            onAction={handleRemoveAll}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                          />
                        )}
                      </>
                    ) : (
                      <Action title="Open" icon={Icon.Folder} onAction={() => handleOpenDirectory(dir.path)} />
                    )}
                    <Action.ShowInFinder path={dir.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}

export function TemporaryDirectoryManager({ onRefreshNeeded }: { onRefreshNeeded: () => void }) {
  return <DirectoryManager type="temporary" onRefreshNeeded={onRefreshNeeded} />;
}
