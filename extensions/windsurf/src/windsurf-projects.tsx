import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  getSelectedFinderItems,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { loadWindsurfProjects, removeWindsurfProject, saveWindsurfProject } from "./utils/storage";
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
      await showFailureToast(error, { title: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenProject(project: WindsurfProject) {
    const opened = await openInWindsurf(project.path);
    // Refresh the list to update the "last opened" time only if opened successfully
    if (opened) {
      await loadProjects();
    }
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
      await showFailureToast(error, { title: "Failed to remove project" });
    }
  }

  async function handleAddProject() {
    try {
      // Try to get selected items from Finder first
      let selectedPaths: string[] = [];

      try {
        const finderItems = await getSelectedFinderItems();
        selectedPaths = finderItems.map((item) => item.path);
      } catch {
        // If no Finder selection, fall back to AppleScript folder selector
        const script = `
          set selectedItem to choose folder with prompt "Select a folder to add to Windsurf projects:"
          return POSIX path of selectedItem
        `;

        return new Promise<void>((resolve) => {
          exec(`osascript -e '${script}'`, async (error, stdout) => {
            if (error) {
              if (error.message.includes("User canceled") || error.message.includes("execution error")) {
                resolve();
                return;
              }
              console.error("Error selecting folder:", error);
              await showFailureToast(error, { title: "Failed to select folder" });
              resolve();
              return;
            }

            const selectedPath = stdout.trim();
            if (!selectedPath) {
              resolve();
              return;
            }

            await addProjectFromPath(selectedPath);
            resolve();
          });
        });
      }

      // Process selected Finder items
      if (selectedPaths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No selection",
          message: "Please select a folder in Finder or use the folder picker",
        });
        return;
      }

      // Add the first selected item (or could loop through all)
      await addProjectFromPath(selectedPaths[0]);
    } catch (error) {
      console.error("Error in handleAddProject:", error);
      await showFailureToast(error, { title: "Failed to add project" });
    }
  }

  async function addProjectFromPath(selectedPath: string) {
    try {
      const stats = fs.statSync(selectedPath);
      const isDirectory = stats.isDirectory();

      // Only allow folders to be added as projects
      if (!isDirectory) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "Only folders can be added as projects",
        });
        return;
      }

      const project: WindsurfProject = {
        name: path.basename(selectedPath),
        path: selectedPath,
        type: "folder",
        lastOpened: new Date(),
      };

      await saveWindsurfProject(project);
      await loadProjects(); // Refresh the list

      await showToast({
        style: Toast.Style.Success,
        title: "Project added",
        message: `Added ${project.name} to recent projects`,
      });
    } catch (fileError) {
      console.error("Error adding project:", fileError);
      await showFailureToast(fileError, { title: "Failed to add project" });
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
          description="Use 'Open with Windsurf' command or add projects manually"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Add Project"
                onAction={handleAddProject}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
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
                  title="Add Project"
                  onAction={handleAddProject}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
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
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
