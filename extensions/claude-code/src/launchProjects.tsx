import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { readdir, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";
import ProjectSessions from "./projectSessions";

interface ProjectInfo {
  name: string;
  path: string;
  lastActivity: Date;
  exists: boolean;
  encodedDirName: string;
}

interface SessionEntry {
  cwd?: string;
  timestamp?: string;
  type?: string;
}

export default function LaunchClaudeProjects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsDir = path.join(homedir(), ".claude", "projects");

      if (!existsSync(projectsDir)) {
        setError("Claude Code projects directory not found. Have you used Claude Code before?");
        setIsLoading(false);
        return;
      }

      const projectDirs = await readdir(projectsDir);
      // Filter out non-directory items and system files
      const validProjectDirs = [];
      for (const dirName of projectDirs) {
        if (dirName.startsWith(".")) continue; // Skip hidden files like .DS_Store
        const dirPath = path.join(projectsDir, dirName);
        try {
          const stats = await stat(dirPath);
          if (stats.isDirectory()) {
            validProjectDirs.push(dirName);
          }
        } catch {
          // Skip if we can't stat the item
          continue;
        }
      }

      const projectPromises = validProjectDirs.map(async (dirName) => {
        return await parseProject(path.join(projectsDir, dirName), dirName);
      });

      const parsedProjects = (await Promise.all(projectPromises))
        .filter((project): project is ProjectInfo => project !== null)
        .filter((project) => project.exists) // Filter out missing projects
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      setProjects(parsedProjects);
    } catch (err) {
      setError(`Failed to load projects: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseProject = async (projectDir: string, encodedDirName: string): Promise<ProjectInfo | null> => {
    try {
      // Get all .jsonl files in the project directory
      const files = await readdir(projectDir);
      const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) {
        return null;
      }

      // Sort by modification time, newest first
      const fileStats = await Promise.all(
        jsonlFiles.map(async (file) => {
          const filePath = path.join(projectDir, file);
          const stats = await stat(filePath);
          return { file, mtime: stats.mtime, path: filePath };
        }),
      );

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Try to extract project path from the most recent .jsonl file
      for (const { path: filePath, mtime } of fileStats) {
        const projectPath = await extractProjectPath(filePath);
        if (projectPath) {
          const projectName = path.basename(projectPath);
          const exists = existsSync(projectPath);

          return {
            name: projectName,
            path: projectPath,
            lastActivity: mtime,
            exists,
            encodedDirName,
          };
        }
      }

      return null;
    } catch (err) {
      console.error(`Failed to parse project ${encodedDirName}:`, err);
      return null;
    }
  };

  const extractProjectPath = async (jsonlFilePath: string): Promise<string | null> => {
    try {
      const content = await readFile(jsonlFilePath, "utf-8");
      const lines = content.trim().split("\n");

      // Parse each line and look for cwd field
      for (const line of lines) {
        if (line.trim()) {
          try {
            const entry: SessionEntry = JSON.parse(line);
            if (entry.cwd && entry.cwd !== "/") {
              return entry.cwd;
            }
          } catch {
            // Skip malformed JSON lines
            continue;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  if (error) {
    return (
      <List>
        <List.Item
          title="Error Loading Projects"
          subtitle={error}
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => {
                  setError(null);
                  setIsLoading(true);
                  loadProjects();
                }}
              />
              <Action.OpenInBrowser
                title="Claude Code Documentation"
                url="https://docs.anthropic.com/en/docs/claude-code"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your Claude Code projects...">
      {projects.length === 0 && !isLoading && (
        <List.Item
          title="No Projects Found"
          subtitle="No Claude Code projects found. Start a new session to see projects here."
          icon="📂"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Claude Code Documentation"
                url="https://docs.anthropic.com/en/docs/claude-code"
              />
            </ActionPanel>
          }
        />
      )}

      {projects.map((project) => (
        <ProjectItem key={`${project.path}-${project.name}-${project.encodedDirName}`} project={project} />
      ))}
    </List>
  );
}

function ProjectItem({ project }: { project: ProjectInfo }) {
  const formatLastActivity = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getIcon = (): string => {
    if (!project.exists) return "📂"; // Greyed folder for missing projects
    return "📁"; // Regular folder for existing projects
  };

  const getSubtitle = (): string => {
    const status = project.exists ? "" : " (Missing)";
    return `${project.path}${status}`;
  };

  return (
    <List.Item
      title={project.name}
      subtitle={getSubtitle()}
      icon={getIcon()}
      accessories={[{ text: formatLastActivity(project.lastActivity) }]}
      actions={
        <ActionPanel>
          <Action
            title="Open with Claude Code"
            icon={Icon.Terminal}
            onAction={async () => {
              try {
                if (!project.exists) {
                  showFailureToast(new Error(`The project path ${project.path} no longer exists`), {
                    title: "Project Not Found",
                  });
                  return;
                }

                const command = `cd "${project.path}" && claude --add-dir "${project.path}"`;
                const result = await executeInTerminal(command);

                if (result.success) {
                  await showTerminalSuccessToast(result.terminalUsed, `Claude Code with ${project.name}`);
                } else {
                  await showTerminalErrorToast(getManualCommand(command), `Claude Code with ${project.name}`);
                }
              } catch (error) {
                console.error("Error opening project:", error);
                showFailureToast(error instanceof Error ? error : new Error("Failed to open project"), {
                  title: "Launch Failed",
                });
              }
            }}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action.Push
            title="View Project Sessions"
            target={
              <ProjectSessions
                projectDirectory={project.path}
                projectName={project.name}
                encodedDirName={project.encodedDirName}
              />
            }
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Claude Command"
            content={`cd "${project.path}" && claude --add-dir "${project.path}"`}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action.CopyToClipboard
            title="Copy Path"
            content={project.path}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {project.exists && (
            <Action.ShowInFinder
              title="Show in Finder"
              path={project.path}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action
            title="Manual Command"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={async () => {
              try {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Manual Command",
                  message: `Run: claude --add-dir "${project.path}"`,
                });
              } catch (error) {
                console.error("Error showing manual command toast:", error);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
