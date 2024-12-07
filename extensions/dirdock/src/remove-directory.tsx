// src/remove-directory.tsx
import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Icon } from "@raycast/api";
import { getDirectories, removeDirectory, clearDirectories, Directory } from "./utils/storage";

export default function Command() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDirectories() {
      try {
        const dirs = await getDirectories();
        setDirectories(dirs);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to Load Directories", (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchDirectories();
  }, []);

  // Function to remove a single directory
  const handleRemoveDirectory = async (dir: Directory) => {
    const response = await confirmAlert({
      title: "Remove Directory",
      message: `Are you sure you want to remove "${dir.name}" from DirDock?`,
      icon: Icon.Trash,
    });

    if (!response) return;

    try {
      await removeDirectory(dir.id);
      const updatedDirs = directories.filter((d) => d.id !== dir.id);
      setDirectories(updatedDirs);
      await showToast(Toast.Style.Success, "Directory Removed", `${dir.name} has been removed from DirDock.`);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to Remove Directory", (error as Error).message);
    }
  };

  // Function to remove all directories
  const handleRemoveAllDirectories = async () => {
    const response = await confirmAlert({
      title: "Remove All Directories",
      message: "Are you sure you want to remove all directories from DirDock?",
      icon: Icon.Trash,
    });

    if (!response) return;

    try {
      await clearDirectories();
      setDirectories([]);
      await showToast(
        Toast.Style.Success,
        "All Directories Removed",
        "All directories have been removed from DirDock.",
      );
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to Remove Directories", (error as Error).message);
    }
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search directories...">
      {directories.map((dir) => (
        <List.Item
          key={dir.id}
          title={dir.name}
          subtitle={dir.path}
          actions={
            <ActionPanel>
              <Action
                title="Remove Directory"
                icon={Icon.Trash}
                onAction={() => handleRemoveDirectory(dir)}
                style={Action.Style.Destructive}
              />
              <Action.CopyToClipboard title="Copy Path" content={dir.path} />
              <Action.Open title="Open Directory" target={dir.path} />
            </ActionPanel>
          }
        />
      ))}
      {directories.length > 0 && (
        <List.Section>
          <List.Item
            title="Remove All Directories"
            subtitle="Clear all directories from DirDock"
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action
                  title="Remove All"
                  icon={Icon.Trash}
                  onAction={handleRemoveAllDirectories}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {directories.length === 0 && (
        <List.EmptyView
          title="No directories to remove."
          description="Add directories using the Add Directory command."
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}
