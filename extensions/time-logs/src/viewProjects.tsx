import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Project } from "./models";
import { getProjects, deleteProject } from "./storage";
import { ProjectForm } from "./components/ProjectForm";

export default function ViewProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <Action
            title="Add New Project"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<ProjectForm onSave={loadProjects} />)}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: Icon.Folder }}
        title="No Projects"
        description="Add your first project to get started!"
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={{ source: Icon.Circle, tintColor: project.color }}
          title={project.name}
          actions={
            <ActionPanel>
              <Action
                title="Edit Project"
                icon={Icon.Pencil}
                onAction={() => push(<ProjectForm project={project} onSave={loadProjects} />)}
              />
              <Action
                title="Add New Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ProjectForm onSave={loadProjects} />)}
              />
              <ActionPanel.Section />
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Project",
                      message: "Are you sure you want to delete this project? This action cannot be undone.",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await deleteProject(project.id);
                    await loadProjects();
                    showToast({
                      style: Toast.Style.Success,
                      title: "Project deleted",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
