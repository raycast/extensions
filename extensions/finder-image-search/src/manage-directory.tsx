import { Action, ActionPanel, Form, List, showToast, Toast, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";

const STORAGE_KEY = "image-search-directories";

interface Directory {
  path: string;
  name: string;
  exists: boolean;
}

export default function ManageDirectory() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDirectories();
  }, []);

  const loadDirectories = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      let dirs: string[] = [];

      if (stored) {
        dirs = JSON.parse(stored);
      }

      const directoriesWithStatus = dirs.map((dirPath) => ({
        path: dirPath,
        name: path.basename(dirPath),
        exists: fs.existsSync(dirPath),
      }));

      setDirectories(directoriesWithStatus);
    } catch (error) {
      console.error("Failed to load directories:", error);
      showToast(Toast.Style.Failure, "Failed to load directories");
    } finally {
      setIsLoading(false);
    }
  };

  const saveDirectories = async (dirs: string[]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(dirs));
      await loadDirectories();
    } catch (error) {
      console.error("Failed to save directories:", error);
      showToast(Toast.Style.Failure, "Failed to save directories");
    }
  };

  const updateDirectories = async (newDirectories: string[]) => {
    await saveDirectories(newDirectories);
  };

  const removeDirectory = async (directoryPath: string) => {
    const confirmed = await confirmAlert({
      title: "Remove Directory",
      message: `Are you sure you want to remove "${path.basename(directoryPath)}" from the search scope?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const newDirectories = directories.filter((d) => d.path !== directoryPath).map((d) => d.path);
      await saveDirectories(newDirectories);
      showToast(Toast.Style.Success, "Directory removed");
    }
  };

  const addCommonDirectories = async () => {
    const homeDir = process.env.HOME || "";
    const commonDirs = [
      path.join(homeDir, "Pictures"),
      path.join(homeDir, "Desktop"),
      path.join(homeDir, "Downloads"),
      path.join(homeDir, "Documents"),
    ];

    const existingPaths = directories.map((d) => d.path);
    const newDirs = commonDirs.filter((dir) => fs.existsSync(dir) && !existingPaths.includes(dir));

    if (newDirs.length === 0) {
      showToast(Toast.Style.Failure, "All common directories are already added or don't exist");
      return;
    }

    const allDirectories = [...existingPaths, ...newDirs];
    await saveDirectories(allDirectories);
    showToast(Toast.Style.Success, `Added ${newDirs.length} common director${newDirs.length === 1 ? "y" : "ies"}`);
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Actions">
        <List.Item
          title="Manage Directories"
          subtitle="Add or remove directories from search scope"
          icon="📁"
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Directories"
                target={
                  <DirectoryManagerForm
                    onUpdate={updateDirectories}
                    existingDirectories={directories.map((d) => d.path)}
                  />
                }
              />
              <Action title="Add Common Directories" onAction={addCommonDirectories} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Search Directories (${directories.length})`}>
        {directories.length === 0 && (
          <List.Item title="No directories configured" subtitle="Add directories to enable image search" icon="❌" />
        )}

        {directories.map((directory) => (
          <List.Item
            key={directory.path}
            title={directory.name}
            subtitle={directory.path}
            icon={directory.exists ? "📁" : "⚠️"}
            accessories={[{ text: directory.exists ? "Available" : "Missing" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Manage Directories"
                  target={
                    <DirectoryManagerForm
                      onUpdate={updateDirectories}
                      existingDirectories={directories.map((d) => d.path)}
                    />
                  }
                />
                <Action
                  title="Remove Directory"
                  style={Action.Style.Destructive}
                  onAction={() => removeDirectory(directory.path)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface DirectoryManagerFormProps {
  onUpdate: (directories: string[]) => Promise<void>;
  existingDirectories: string[];
}

function DirectoryManagerForm({ onUpdate, existingDirectories }: DirectoryManagerFormProps) {
  const [selectedDirectories, setSelectedDirectories] = useState<string[]>(existingDirectories);
  const [currentDirectories, setCurrentDirectories] = useState<string[]>(existingDirectories);
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectoryChange = async (newDirectories: string[]) => {
    setSelectedDirectories(newDirectories);

    // Auto-update directories when selection changes
    setIsLoading(true);
    try {
      await onUpdate(newDirectories);

      // Calculate changes for feedback based on the previous state
      const added = newDirectories.filter((dir) => !currentDirectories.includes(dir));
      const removed = currentDirectories.filter((dir) => !newDirectories.includes(dir));

      // Update current state
      setCurrentDirectories(newDirectories);

      // Show feedback only if there were actual changes
      if (added.length > 0 || removed.length > 0) {
        if (added.length > 0 && removed.length > 0) {
          showToast(Toast.Style.Success, `Updated: +${added.length}, -${removed.length}`);
        } else if (added.length > 0) {
          showToast(Toast.Style.Success, `Added ${added.length} director${added.length === 1 ? "y" : "ies"}`);
        } else if (removed.length > 0) {
          showToast(Toast.Style.Success, `Removed ${removed.length} director${removed.length === 1 ? "y" : "ies"}`);
        }
      }
    } catch (error) {
      console.error("Failed to update directories:", error);
      showToast(Toast.Style.Failure, "Failed to update directories");
      // Revert selection on error
      setSelectedDirectories(currentDirectories);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form isLoading={isLoading}>
      <Form.FilePicker
        id="directories"
        title="Search Directories"
        allowMultipleSelection={true}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={selectedDirectories}
        onChange={handleDirectoryChange}
        info="Select directories to include in your image search. Changes are applied automatically."
      />

      <Form.Separator />

      <Form.Description
        title="Instructions"
        text="• Select directories to include in image searches
• Deselect directories to remove them from searches
• Use Cmd+click to select/deselect multiple directories
• Changes are applied automatically as you make selections"
      />
    </Form>
  );
}
