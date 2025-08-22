import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Form, useNavigation, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import { DisplayProjectDirectory } from "./types";
import { ProjectDirectoryStorage } from "./utils/storage";
import { scanProjectsInDirectory } from "./utils/projectScanner";

export default function DirectorySettings() {
  const [directories, setDirectories] = useState<DisplayProjectDirectory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDirectories();
  }, []);

  async function loadDirectories() {
    try {
      setIsLoading(true);
      const dirs = await ProjectDirectoryStorage.getDirectories();

      // Get project count for each directory
      const dirsWithCounts = await Promise.all(
        dirs.map(async (dir) => {
          try {
            const projects = await scanProjectsInDirectory(dir.path, !!dir.recursive, dir.path);
            return { ...dir, projectCount: projects.length };
          } catch {
            return { ...dir, projectCount: 0, hasError: true };
          }
        }),
      );

      setDirectories(dirsWithCounts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Sync logic from Preferences has been removed

  async function toggleDirectory(path: string) {
    try {
      await ProjectDirectoryStorage.toggleDirectory(path);
      await loadDirectories();
      showHUD("Directory status updated");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function removeDirectory(path: string) {
    try {
      await ProjectDirectoryStorage.removeDirectory(path);
      await loadDirectories();
      showHUD("Directory removed");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const getDirectoryIcon = (directory: DisplayProjectDirectory) => {
    if (directory.hasError) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    }
    return {
      source: Icon.Folder,
      tintColor: directory.enabled ? Color.Green : Color.SecondaryText,
    };
  };

  const getAccessories = (directory: DisplayProjectDirectory) => {
    const accessories = [];

    if (directory.hasError) {
      accessories.push({ text: "Invalid Path", icon: Icon.XMarkCircle });
    } else {
      accessories.push({
        text: `${directory.projectCount || 0} projects`,
        icon: Icon.Document,
      });
    }

    if (directory.recursive) {
      accessories.push({
        text: "Recursive Scan",
        icon: Icon.Layers,
      });
    }

    accessories.push({
      text: directory.enabled ? "Enabled" : "Disabled",
      icon: directory.enabled ? Icon.CheckCircle : Icon.XMarkCircle,
    });

    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Project Directory Settings"
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Directory"
            target={<AddDirectoryForm onAdded={loadDirectories} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {directories.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Project Directories"
          description="Add a project directory to start scanning for projects"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Directory"
                target={<AddDirectoryForm onAdded={loadDirectories} />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Actions">
            <List.Item
              key="add-directory"
              title="Add New Directory..."
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Add New Directory"
                    target={<AddDirectoryForm onAdded={loadDirectories} />}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Configured Directories (${directories.length})`}>
            {directories.map((directory) => (
              <List.Item
                key={directory.path}
                title={directory.name}
                subtitle={directory.path}
                icon={getDirectoryIcon(directory)}
                accessories={getAccessories(directory)}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Directory Actions">
                      <Action
                        title={directory.enabled ? "Disable" : "Enable"}
                        icon={directory.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                        onAction={() => toggleDirectory(directory.path)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="File Actions">
                      <Action.ShowInFinder title="Show in Finder" path={directory.path} icon={Icon.Finder} />
                      <Action.CopyToClipboard title="Copy Path" content={directory.path} icon={Icon.Clipboard} />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Management">
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={loadDirectories}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action.Push
                        title="Add New Directory"
                        icon={Icon.Plus}
                        target={<AddDirectoryForm onAdded={loadDirectories} />}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action
                        title="Remove Directory"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => removeDirectory(directory.path)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface AddDirectoryFormProps {
  onAdded: () => void;
}

function AddDirectoryForm({ onAdded }: AddDirectoryFormProps) {
  const { pop } = useNavigation();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [namePrefix, setNamePrefix] = useState("");
  const [recursive, setRecursive] = useState(false);

  async function handleSubmit() {
    if (selectedPaths.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select at least one directory",
      });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: "Adding directories..." });

      const existing = await ProjectDirectoryStorage.getDirectories();
      let addedCount = 0;
      let totalProjects = 0;

      for (const path of selectedPaths) {
        if (existing.some((d) => d.path === path)) {
          continue; // Skip existing directories
        }

        const projects = await scanProjectsInDirectory(path, recursive, path);
        totalProjects += projects.length;

        const folderName = path.split("/").pop() || path;
        const displayName = namePrefix.trim() ? `${namePrefix.trim()}-${folderName}` : folderName;

        await ProjectDirectoryStorage.addDirectory({
          path: path.trim(),
          name: displayName,
          enabled: true,
          recursive,
        });

        addedCount++;
      }

      if (addedCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Successfully Added",
          message: `Added ${addedCount} directories, found ${totalProjects} projects`,
        });
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: "All Directories Already Exist",
          message: "The selected directories are already in the list",
        });
      }

      onAdded();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Add Project Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Directory" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select the root directories containing your projects, and the extension will automatically scan them." />

      <Form.FilePicker
        id="directoryPaths"
        title="Select Project Directories"
        allowMultipleSelection={true}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={selectedPaths}
        onChange={setSelectedPaths}
        info="You can select multiple directories, and each will be scanned."
      />

      <Form.TextField
        id="namePrefix"
        title="Display Name Prefix"
        placeholder="Work Projects"
        value={namePrefix}
        onChange={setNamePrefix}
        info="An optional prefix to distinguish directories from different sources."
      />

      <Form.Checkbox
        id="recursive"
        title="Recursive Scan"
        label="Scan all subdirectories for projects"
        value={recursive}
        onChange={setRecursive}
        info="When enabled, all levels of subdirectories will be scanned, which may increase scan time."
      />

      <Form.Description text={`Selected ${selectedPaths.length} directories`} />

      {selectedPaths.length > 0 && (
        <Form.Description text={`Directory list:\n${selectedPaths.map((p) => `• ${p}`).join("\n")}`} />
      )}
    </Form>
  );
}
