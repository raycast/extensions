import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { exec } from "child_process";
import { homedir } from "os";
import { join, basename } from "path";
import { existsSync } from "fs";
import { useState, useEffect } from "react";

interface Project {
  path: string;
  name: string;
  type: "folder" | "file";
  lastOpened?: number;
}

interface ItemTableEntry {
  folderUri?: string;
  fileUri?: string;
}

interface ItemTableValue {
  entries?: ItemTableEntry[];
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const dbPath = join(
          homedir(),
          "Library/Application Support/Trae/User/globalStorage/state.vscdb",
        );

        if (!existsSync(dbPath)) {
          throw new Error(
            "Trae database not found. Please ensure Trae is installed and you have opened projects.",
          );
        }

        const query =
          "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'";
        const command = `sqlite3 "${dbPath}" "${query}"`;

        exec(command, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`exec error: ${error}`);
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to read database",
              message: stderr || error.message,
            });
            setIsLoading(false);
            return;
          }

          try {
            if (!stdout.trim()) {
              setProjects([]);
              setIsLoading(false);
              return;
            }

            const data = JSON.parse(stdout.trim()) as ItemTableValue;
            const entries = data.entries || [];

            const parsedProjects: Project[] = entries
              .map((entry: ItemTableEntry) => {
                let path = "";
                let type: "folder" | "file" = "folder";

                if (entry.folderUri) {
                  path = entry.folderUri;
                  type = "folder";
                } else if (entry.fileUri) {
                  path = entry.fileUri;
                  type = "file";
                }

                // Remove file:// prefix and decode URI
                if (path.startsWith("file://")) {
                  path = path.substring(7);
                }
                path = decodeURIComponent(path);

                return {
                  path,
                  name: basename(path),
                  type,
                };
              })
              .filter((p: Project) => p.path); // Filter out empty paths

            setProjects(parsedProjects);
            setIsLoading(false);
          } catch (parseError) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to parse project data",
              message: String(parseError),
            });
            setIsLoading(false);
          }
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading projects",
          message: error instanceof Error ? error.message : String(error),
        });
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const openProject = async (project: Project) => {
    try {
      exec(`open -b com.trae.app "${project.path}"`);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open project",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
    >
      {projects.map((project, index) => (
        <List.Item
          key={index}
          title={project.name}
          subtitle={project.path}
          icon={project.type === "folder" ? Icon.Folder : Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Open in Trae"
                onAction={() => openProject(project)}
              />
              <Action.CopyToClipboard
                content={project.path}
                title="Copy Path"
              />
              <Action
                title="Open New Window"
                onAction={() => {
                  exec("open -b com.trae.app -n");
                  closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No recent projects found"
        description="Open some projects in Trae first!"
      />
    </List>
  );
}
