import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import React, { useEffect, useState, useMemo } from "react";
import {
  getRecentProjects,
  removeRecentProject,
  clearRecentProjects,
  pinProject,
  unpinProject,
  isPinned,
} from "./utils/storage";
import {
  openInCursor,
  detectProjectType,
  type RecentProject,
} from "./utils/cursor";
import * as path from "path";
import { exec } from "child_process";

export default function Command() {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedPaths, setPinnedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    setIsLoading(true);
    try {
      const recentProjects = await getRecentProjects();

      // Load pinned status
      const pinned = new Set<string>();
      for (const project of recentProjects) {
        if (await isPinned(project.path)) {
          pinned.add(project.path);
        }
      }
      setPinnedPaths(pinned);

      setProjects(recentProjects);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProject = async (project: RecentProject) => {
    const success = await openInCursor(project.path);
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Opening Project",
        message: `Opening "${project.name}" in Cursor`,
      });
    }
  };

  const handleCopyPath = async (projectPath: string) => {
    await Clipboard.copy(projectPath);
    await showToast({
      style: Toast.Style.Success,
      title: "Path Copied",
      message: "Project path copied to clipboard",
    });
  };

  const handleOpenInTerminal = async (projectPath: string) => {
    return new Promise<void>((resolve) => {
      // Try Windows Terminal, PowerShell, or CMD
      const commands = [
        `wt -d "${projectPath}"`, // Windows Terminal
        `powershell -NoExit -Command "cd '${projectPath}'"`, // PowerShell
        `cmd /k "cd /d ${projectPath}"`, // CMD
      ];

      let commandIndex = 0;
      const tryNextCommand = () => {
        if (commandIndex >= commands.length) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to Open Terminal",
            message: "Could not find a terminal application",
          });
          resolve();
          return;
        }

        exec(commands[commandIndex], (error) => {
          if (error) {
            commandIndex++;
            tryNextCommand();
          } else {
            showToast({
              style: Toast.Style.Success,
              title: "Opening Terminal",
              message: `Opening terminal in "${path.basename(projectPath)}"`,
            });
            resolve();
          }
        });
      };

      tryNextCommand();
    });
  };

  const handleTogglePin = async (projectPath: string) => {
    const currentlyPinned = pinnedPaths.has(projectPath);
    if (currentlyPinned) {
      await unpinProject(projectPath);
      setPinnedPaths((prev) => {
        const next = new Set(prev);
        next.delete(projectPath);
        return next;
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Project Unpinned",
        message: "Removed from pinned projects",
      });
    } else {
      await pinProject(projectPath);
      setPinnedPaths((prev) => new Set(prev).add(projectPath));
      await showToast({
        style: Toast.Style.Success,
        title: "Project Pinned",
        message: "Added to pinned projects",
      });
    }
    await loadRecentProjects();
  };

  const handleRemoveProject = async (projectPath: string) => {
    await removeRecentProject(projectPath);
    await unpinProject(projectPath); // Also unpin if pinned
    await loadRecentProjects();
    await showToast({
      style: Toast.Style.Success,
      title: "Project Removed",
      message: "Removed from recent projects",
    });
  };

  const handleClearAll = async () => {
    await clearRecentProjects();
    await loadRecentProjects();
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared",
      message: "All recent projects cleared",
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getProjectIcon = (projectPath: string, projectType?: string): Icon => {
    const type = projectType || detectProjectType(projectPath);

    switch (type) {
      case "node":
        return Icon.Code;
      case "python":
        return Icon.Terminal;
      case "go":
        return Icon.Code;
      case "rust":
        return Icon.Code;
      case "java":
        return Icon.Code;
      case "php":
        return Icon.Code;
      case "ruby":
        return Icon.Code;
      case "git":
        return Icon.Code;
      default:
        return Icon.Folder;
    }
  };

  // Separate pinned and unpinned projects (memoized for performance)
  // MUST be called before any early returns (Rules of Hooks)
  const { pinnedProjects, unpinnedProjects } = useMemo(() => {
    const pinned = projects.filter((p) => pinnedPaths.has(p.path));
    const unpinned = projects.filter((p) => !pinnedPaths.has(p.path));
    return { pinnedProjects: pinned, unpinnedProjects: unpinned };
  }, [projects, pinnedPaths]);

  if (!isLoading && projects.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No Recent Projects"
          description="Get started by creating a new project or opening an existing directory in Cursor. Your recent projects will appear here."
          actions={
            <ActionPanel>
              <Action
                title="Open Directory"
                icon={Icon.Folder}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Tip",
                    message: 'Search for "Open Directory" to browse folders',
                  });
                }}
              />
              <Action
                title="Create Project"
                icon={Icon.Plus}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Tip",
                    message:
                      'Search for "Create Project" to create a new project',
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
    >
      {/* Pinned Projects Section */}
      {pinnedProjects.length > 0 && (
        <>
          <List.Section
            title="Pinned Projects"
            subtitle={`${pinnedProjects.length} ${pinnedProjects.length === 1 ? "project" : "projects"}`}
          >
            {pinnedProjects.map((project) => {
              return (
                <List.Item
                  key={project.path}
                  icon={getProjectIcon(project.path, project.projectType)}
                  title={project.name}
                  subtitle={project.path}
                  accessories={[
                    { icon: Icon.Pin, tooltip: "Pinned" },
                    { text: formatDate(project.lastOpened) },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.ArrowRight}
                        title="Open in Cursor"
                        onAction={() => handleOpenProject(project)}
                      />
                      <Action.ShowInFinder
                        path={project.path}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy Path"
                        onAction={() => handleCopyPath(project.path)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        icon={Icon.Terminal}
                        title="Open in Terminal"
                        onAction={() => handleOpenInTerminal(project.path)}
                      />
                      <Action
                        icon={Icon.PinDisabled}
                        title="Unpin Project"
                        onAction={() => handleTogglePin(project.path)}
                      />
                      <Action
                        icon={Icon.ArrowClockwise}
                        title="Refresh"
                        onAction={loadRecentProjects}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action
                        icon={Icon.Trash}
                        title="Remove from Recent"
                        onAction={() => handleRemoveProject(project.path)}
                        style={Action.Style.Destructive}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          {unpinnedProjects.length > 0 && (
            <List.Section
              title="Recent Projects"
              subtitle={`${unpinnedProjects.length} ${unpinnedProjects.length === 1 ? "project" : "projects"}`}
            />
          )}
        </>
      )}

      {/* Unpinned Projects */}
      {unpinnedProjects.map((project) => {
        return (
          <List.Item
            key={project.path}
            icon={getProjectIcon(project.path, project.projectType)}
            title={project.name}
            subtitle={project.path}
            accessories={[{ text: formatDate(project.lastOpened) }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.ArrowRight}
                  title="Open in Cursor"
                  onAction={() => handleOpenProject(project)}
                />
                <Action.ShowInFinder
                  path={project.path}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  icon={Icon.Clipboard}
                  title="Copy Path"
                  onAction={() => handleCopyPath(project.path)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  icon={Icon.Terminal}
                  title="Open in Terminal"
                  onAction={() => handleOpenInTerminal(project.path)}
                />
                <Action
                  icon={Icon.Pin}
                  title="Pin Project"
                  onAction={() => handleTogglePin(project.path)}
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  onAction={loadRecentProjects}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  icon={Icon.Trash}
                  title="Remove from Recent"
                  onAction={() => handleRemoveProject(project.path)}
                  style={Action.Style.Destructive}
                />
                {projects.length > 0 && (
                  <Action
                    icon={Icon.Trash}
                    title="Clear All Recent Projects"
                    onAction={handleClearAll}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
