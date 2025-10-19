import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CreateProject from "./create-project";
import EditProject from "./edit-project";
import { isAuthenticated, makeAuthenticatedRequest } from "./lib/auth";
import { Project } from "./types";

export default function Projects() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const authenticated = await isAuthenticated();
    setIsAuth(authenticated);

    if (authenticated) {
      await loadProjects();
    } else {
      setIsLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const response = await makeAuthenticatedRequest("/projects");

      if (response.ok) {
        const data = await response.json();
        setProjects((data as Project[]) || []);
      } else if (response.status === 401) {
        setIsAuth(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your credentials in Preferences",
        });
      } else {
        throw new Error("Failed to load projects");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load projects",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteProject(project: Project) {
    try {
      const response = await makeAuthenticatedRequest(`/projects/${project.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadProjects();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Project deleted",
        });
      } else {
        throw new Error("Failed to delete project");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to delete project",
      });
    }
  }

  if (isAuth === false) {
    return (
      <Detail
        markdown={"Please set your Braintick email and password in Raycast Preferences."}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects"
          description="Create your first project to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Project"
                icon={Icon.Plus}
                target={<CreateProject onProjectCreated={loadProjects} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon={{ source: Icon.Circle, tintColor: project.color as Color }}
            title={project.name}
            accessories={
              [
                project.created_at && {
                  icon: Icon.Calendar,
                  text: new Date(project.created_at).toLocaleDateString(),
                },
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  target={<EditProject project={project} onProjectUpdated={loadProjects} />}
                />
                <Action.Push
                  title="Create Project"
                  icon={Icon.Plus}
                  target={<CreateProject onProjectCreated={loadProjects} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteProject(project)}
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
