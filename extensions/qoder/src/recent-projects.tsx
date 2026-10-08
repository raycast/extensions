import { ActionPanel, Action, List, Icon, open, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface Project {
  name: string;
  path: string;
}

interface RecentEntry {
  folderUri?: string;
  workspace?: { configPath: string };
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  async function loadRecentProjects() {
    try {
      const dbPath = join(homedir(), "Library", "Application Support", "Qoder", "User", "globalStorage", "state.vscdb");

      // Use execFile instead of execSync for better security (no shell interpretation)
      const { stdout } = await execFileAsync("/usr/bin/sqlite3", [
        dbPath,
        "SELECT value FROM ItemTable WHERE key='history.recentlyOpenedPathsList';",
      ]);

      if (!stdout || !stdout.trim()) {
        setProjects([]);
        return;
      }

      const data = JSON.parse(stdout.trim()) as { entries: RecentEntry[] };

      const projectList: Project[] = (data.entries || [])
        .map((entry: RecentEntry) => {
          // Handle both folder and workspace entries
          let uri = entry.folderUri;
          if (!uri && entry.workspace?.configPath) {
            // Extract folder path from workspace config path
            uri = entry.workspace.configPath.replace(/\/[^/]+\.code-workspace$/, "");
          }

          if (!uri) return null;

          const decodedPath = decodeURIComponent(uri.replace("file://", ""));
          return {
            name: decodedPath.split("/").pop() || "Untitled",
            path: decodedPath,
          };
        })
        .filter((p): p is Project => p !== null && Boolean(p.path));

      setProjects(projectList);
    } catch (error) {
      console.error("Error loading recent projects:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent projects",
        message:
          error instanceof Error ? error.message : "Make sure Qoder is installed and you have opened some projects",
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
