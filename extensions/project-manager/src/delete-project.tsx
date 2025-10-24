import { Action, ActionPanel, confirmAlert, List, showToast, Toast, Icon, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, Project, deleteProject as deleteProjectFromStorage } from "./utils/storage";

export default function DeleteProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${project.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteProjectFromStorage(project.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Project deleted",
        message: project.name,
      });
      await loadProjects();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects to delete...">
      {projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects to delete"
          description="Use 'Add Project' to add your first project"
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            subtitle={project.path}
            accessories={[
              ...(project.workspaceFile ? [{ icon: Icon.Document, tooltip: "Has workspace" }] : []),
              { tag: { value: project.editor, color: "#32D74B" } },
              { text: project.terminal },
            ]}
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action title="Delete Project" onAction={() => handleDelete(project)} icon={Icon.Trash} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
