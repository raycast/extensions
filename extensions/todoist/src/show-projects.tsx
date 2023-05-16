import { ActionPanel, Icon, showToast, Toast, List, confirmAlert, Action, Color } from "@raycast/api";
import { useMemo } from "react";

import {
  Project as TProject,
  updateProject,
  deleteProject as apiDeleteProject,
  archiveProject as apiArchiveProject,
  handleError,
} from "./api";
import Project from "./components/Project";
import ProjectForm from "./components/ProjectForm";
import RefreshAction from "./components/RefreshAction";
import View from "./components/View";
import { isTodoistInstalled } from "./helpers/isTodoistInstalled";
import { getProjectAppUrl, getProjectIcon, getProjectUrl } from "./helpers/projects";
import useCachedData from "./hooks/useCachedData";

function Projects() {
  const [data, setData] = useCachedData();

  const projects = useMemo(() => {
    return data?.projects.filter((p) => !p.inbox_project) ?? [];
  }, [data]);

  async function toggleFavorite(project: TProject) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: project.is_favorite ? "Removing from favorites" : "Adding to favorites",
      });

      await updateProject({ id: project.id, is_favorite: !project.is_favorite }, { data, setData });

      await showToast({
        style: Toast.Style.Success,
        title: project.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      handleError({
        error,
        title: project.is_favorite ? "Unable to remove from favorites" : "Unable to add to favorites",
      });
    }
  }

  async function archiveProject(id: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Archiving project" });

      await apiArchiveProject(id, { data, setData });

      await showToast({ style: Toast.Style.Success, title: "Project archived" });
    } catch (error) {
      handleError({ error, title: "Unable to archive project" });
    }
  }

  async function deleteProject(id: string) {
    if (
      await confirmAlert({
        title: "Delete Project",
        message: "Are you sure you want to delete this project?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

        await apiDeleteProject(id, { data, setData });

        await showToast({ style: Toast.Style.Success, title: "Project deleted" });
      } catch (error) {
        handleError({ error, title: "Unable to delete project" });
      }
    }
  }

  return (
    <List searchBarPlaceholder="Filter projects by name">
      {projects.map((project) => {
        return (
          <List.Item
            key={project.id}
            icon={getProjectIcon(project)}
            title={project.name}
            accessories={[
              {
                icon: project.is_favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined,
                tooltip: project.is_favorite ? "Favorite" : undefined,
              },
            ]}
            actions={
              <ActionPanel title={project.name}>
                <Action.Push icon={Icon.Sidebar} title="Show Tasks" target={<Project projectId={project.id} />} />
                {isTodoistInstalled ? (
                  <Action.Open
                    title="Open Project in Todoist"
                    target={getProjectAppUrl(project.id)}
                    icon="todoist.png"
                    application="Todoist"
                  />
                ) : (
                  <Action.OpenInBrowser
                    title="Open Task in Browser"
                    url={getProjectUrl(project.id)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                {!project.inbox_project ? (
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Project"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={<ProjectForm project={project} />}
                    />

                    <Action
                      title={project.is_favorite ? "Remove From Favorites" : "Add to Favorites"}
                      icon={Icon.Star}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={() => toggleFavorite(project)}
                    />

                    <Action
                      title="Archive Project"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => archiveProject(project.id)}
                    />

                    <Action
                      title="Delete Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => deleteProject(project.id)}
                    />
                  </ActionPanel.Section>
                ) : null}
                <ActionPanel.Section>
                  <Action.Push
                    title="Add New Project"
                    target={<ProjectForm fromProjectList={true} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    icon={Icon.PlusCircle}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Project URL"
                    content={getProjectUrl(project.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    title="Copy Project Title"
                    content={project.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel.Section>

                <RefreshAction />
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView
        title="You don't have any projects."
        actions={
          <ActionPanel>
            <Action.Push title="Create Project" icon={Icon.Plus} target={<ProjectForm fromProjectList={true} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Projects />
    </View>
  );
}
