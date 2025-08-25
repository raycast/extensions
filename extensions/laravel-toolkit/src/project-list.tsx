import { List, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getProjects,
  setActiveProject,
  getActiveProject,
  removeProject,
  clearActiveProject,
} from "../lib/projectStore";

export default function ProjectList() {
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [activeProject, setActiveProjectState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjects().then(setProjects), getActiveProject().then(setActiveProjectState)]).finally(() =>
      setIsLoading(false),
    );
  }, []);

  const handleSetActive = async (name: string, path: string) => {
    await setActiveProject(path);
    setActiveProjectState(path);
    await showToast({
      style: Toast.Style.Success,
      title: `"${name}" is now active`,
    });
  };

  const handleRemoveProject = async (name: string, path: string) => {
    const confirmed = await confirmAlert({
      title: "Remove Project",
      message: `Are you sure you want to remove "${name}" from your project list?\n\nThis will not delete any files, just remove it from Raycast.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeProject(name);
      const updatedProjects = { ...projects };
      delete updatedProjects[name];
      setProjects(updatedProjects);

      // If removing the active project, clear it
      if (activeProject === path) {
        await clearActiveProject();
        setActiveProjectState(null);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Removed "${name}" from projects`,
      });
    } catch (error) {
      console.error("Failed to remove project:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove project",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const projectEntries = Object.entries(projects);

  return (
    <List searchBarPlaceholder="Search Laravel projects..." isLoading={isLoading}>
      {projectEntries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Laravel Projects"
          description="Use 'Laravel: Add Project' to add your first project"
          icon={Icon.Folder}
        />
      ) : (
        projectEntries.map(([name, path]) => (
          <List.Item
            key={name}
            title={name}
            subtitle={path}
            icon={activeProject === path ? Icon.CheckCircle : Icon.Circle}
            accessories={activeProject === path ? [{ text: "Active", icon: Icon.Star }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Active Project"
                  icon={Icon.CheckCircle}
                  onAction={() => handleSetActive(name, path)}
                />
                <Action
                  title="Remove Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveProject(name, path)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
