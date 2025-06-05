import { Action, ActionPanel, List, showToast, Toast, Icon, Color, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { loadWindsurfProjects, removeWindsurfProject } from "./utils/storage";
import { openInWindsurf, formatRelativeTime } from "./utils/windsurf";
import { WindsurfProject } from "./utils/types";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

export default function WindsurfProjects() {
  const [projects, setProjects] = useState<WindsurfProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const loadedProjects = await loadWindsurfProjects();
      // Filter out projects that no longer exist
      const existingProjects = loadedProjects.filter((project) => {
        try {
          return fs.existsSync(project.path);
        } catch {
          return false;
        }
      });
      setProjects(existingProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: "Could not load Windsurf projects",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenProject(project: WindsurfProject) {
    await openInWindsurf(project.path);
    // Refresh the list to update the "last opened" time
    await loadProjects();
  }

  async function handleRemoveProject(project: WindsurfProject) {
    try {
      await removeWindsurfProject(project.path);
      setProjects((prev) => prev.filter((p) => p.path !== project.path));
      await showToast({
        style: Toast.Style.Success,
        title: "Project removed",
        message: `Removed ${project.name} from recent projects`,
      });
    } catch (error) {
      console.error("Error removing project:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove project",
        message: "Could not remove project from list",
      });
    }
  }

  function getProjectIcon(project: WindsurfProject) {
    if (project.type === "folder") {
      return { source: Icon.Folder, tintColor: Color.Blue };
    } else {
      const ext = path.extname(project.path).toLowerCase();
      switch (ext) {
        case ".js":
        case ".jsx":
        case ".ts":
        case ".tsx":
          return { source: Icon.Code, tintColor: Color.Yellow };
        case ".py":
          return { source: Icon.Code, tintColor: Color.Green };
        case ".json":
          return { source: Icon.Document, tintColor: Color.Orange };
        case ".md":
          return { source: Icon.Document, tintColor: Color.Purple };
        default:
          return { source: Icon.Document, tintColor: Color.SecondaryText };
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Windsurf projects...">
      {projects.length === 0 ? (
        <List.EmptyView
          title="No Windsurf Projects"
          description="Use 'Open with Windsurf' command to add projects to this list"
          icon={Icon.Folder}
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.path}
            title={project.name}
            subtitle={project.path}
            accessories={[
              { text: formatRelativeTime(project.lastOpened) },
              { text: project.type === "folder" ? "Folder" : "File" },
            ]}
            icon={getProjectIcon(project)}
            actions={
              <ActionPanel>
                <Action title="Open in Windsurf" onAction={() => handleOpenProject(project)} icon={Icon.ArrowRight} />
                <Action
                  title="Show in Finder"
                  onAction={() => {
                    const dirPath = project.type === "folder" ? project.path : path.dirname(project.path);
                    exec(`open "${dirPath}"`);
                  }}
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
                <Action
                  title="Copy Path"
                  onAction={async () => {
                    await Clipboard.copy(project.path);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Path copied",
                      message: "Project path copied to clipboard",
                    });
                  }}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Remove from List"
                  onAction={() => handleRemoveProject(project)}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
