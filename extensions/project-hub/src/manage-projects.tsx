import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project } from "./types";
import { getProjects, deleteProject } from "./utils/storage";
import { ProjectForm } from "./components/ProjectForm";
import { ProjectView } from "./components/ProjectView";
import { showFailureToast, getAvatarIcon } from "@raycast/utils";
import { CreateProjectAction } from "./components/actions/CreateProjectAction";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProjects() {
    try {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProject(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Project deleted",
      });
      await loadProjects();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete project" });
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <CreateProjectAction onSave={loadProjects} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Document}
        title="No Projects"
        description="Create your first project to get started"
        actions={
          <ActionPanel>
            <CreateProjectAction onSave={loadProjects} showShortcut={false} />
          </ActionPanel>
        }
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={getAvatarIcon(project.title, { background: project.color || "#8E8E93", gradient: false })}
          title={project.title}
          subtitle={project.subtitle}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push title="Open Project" icon={Icon.ArrowRight} target={<ProjectView project={project} />} />
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  target={<ProjectForm project={project} onSave={loadProjects} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <CreateProjectAction onSave={loadProjects} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(project.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
