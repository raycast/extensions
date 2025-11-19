import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { readdir, readFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Workspace {
  id: string;
  name: string;
  path: string;
}

export default function Command() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const workspaceStoragePath = join(homedir(), "AppData", "Roaming", "Code", "User", "workspaceStorage");
        const folders = await readdir(workspaceStoragePath);
        const workspaceList: Workspace[] = [];

        for (const folder of folders) {
          try {
            const workspaceJsonPath = join(workspaceStoragePath, folder, "workspace.json");
            const content = await readFile(workspaceJsonPath, "utf-8");
            const data = JSON.parse(content);

            if (data.folder) {
              let folderPath = data.folder.replace("file:///", "");
              folderPath = decodeURIComponent(folderPath);

              // Convert forward slashes to backslashes for Windows
              folderPath = folderPath.replace(/\//g, "\\");

              const pathParts = folderPath.split("\\");
              const workspaceName = pathParts[pathParts.length - 1] || folderPath;

              workspaceList.push({
                id: folder,
                name: workspaceName,
                path: folderPath,
              });
            }
          } catch {
            // ignore invalid folders
            continue;
          }
        }

        workspaceList.sort((a, b) => a.name.localeCompare(b.name));
        setWorkspaces(workspaceList);

        if (workspaceList.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No workspaces found",
            message: "Could not find any VS Code workspaces",
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading workspaces",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkspaces();
  }, []);

  async function openWorkspace(workspace: Workspace) {
    try {
      // Use VS Code CLI to open the workspace
      await execAsync(`code "${workspace.path}"`);
      showToast({
        style: Toast.Style.Success,
        title: "Opening workspace",
        message: workspace.name,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open workspace",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function deleteWorkspace(workspace: Workspace) {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${workspace.name}"? This will remove it from VS Code's workspace history.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const workspaceStoragePath = join(homedir(), "AppData", "Roaming", "Code", "User", "workspaceStorage");
      const workspaceFolderPath = join(workspaceStoragePath, workspace.id);

      // Delete the entire workspace folder
      await rm(workspaceFolderPath, { recursive: true, force: true });

      // Remove from local state
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspace.id));

      showToast({
        style: Toast.Style.Success,
        title: "Workspace deleted",
        message: workspace.name,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete workspace",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search VS Code workspaces...">
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.id}
          title={workspace.name}
          icon={Icon.Code}
          accessories={[{ text: workspace.path }]}
          actions={
            <ActionPanel>
              <Action title="Open in VS Code" icon={Icon.Code} onAction={() => openWorkspace(workspace)} />
              <Action
                title="Delete Workspace"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteWorkspace(workspace)}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={workspace.path}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
