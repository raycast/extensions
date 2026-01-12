import { ActionPanel, Action, List, Icon, open, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { readFile } from "fs/promises";
import { join } from "path";

interface Project {
  name: string;
  path: string;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  async function loadRecentProjects() {
    try {
      const qoderStoragePath = join(
        homedir(),
        "Library",
        "Application Support",
        "Qoder",
        "User",
        "globalStorage",
        "storage.json",
      );
      const data = await readFile(qoderStoragePath, "utf-8");
      const storage = JSON.parse(data);

      const folders = storage.backupWorkspaces?.folders || [];
      const projectList: Project[] = folders
        .map((folder: { folderUri: string }) => {
          const path = folder.folderUri.replace("file://", "");
          return {
            name: path.split("/").pop() || "Untitled",
            path: path,
          };
        })
        .filter((p: Project) => p.path);

      setProjects(projectList);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent projects",
        message: "Make sure Qoder is installed and you have opened some projects",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function openProject(project: Project) {
    try {
      await closeMainWindow();
      await open(project.path, "com.qoder.ide");
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open project",
        message: "Please make sure Qoder is installed",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Recent Projects"
          description="Open some projects in Qoder to see them here"
        />
      ) : (
        projects.map((project, index) => (
          <List.Item
            key={index}
            title={project.name}
            subtitle={project.path}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action title="Open in Qoder" onAction={() => openProject(project)} icon={Icon.Terminal} />
                <Action.ShowInFinder path={project.path} />
                <Action.OpenWith path={project.path} />
                <Action.CopyToClipboard title="Copy Path" content={project.path} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
