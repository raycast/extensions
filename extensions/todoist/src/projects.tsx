import { getColor, Project as TProject } from "@doist/todoist-api-typescript";
import { ActionPanel, Icon, showToast, Toast, List, confirmAlert, Action, Color } from "@raycast/api";
import useSWR, { mutate } from "swr";
import { todoist, handleError } from "./api";
import Project from "./components/Project";
import ProjectForm from "./components/ProjectForm";
import { SWRKeys } from "./types";

export default function Projects() {
  const { data, error } = useSWR(SWRKeys.projects, () => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const projects = data || [];

  async function toggleFavorite(project: TProject) {
    await showToast({
      style: Toast.Style.Animated,
      title: project.favorite ? "Removing from favorites" : "Adding to favorites",
    });

    try {
      await todoist.updateProject(project.id, { name: project.name, favorite: !project.favorite });
      await showToast({
        style: Toast.Style.Success,
        title: project.favorite ? "Removed from favorites" : "Added to favorites",
      });
      mutate(SWRKeys.projects);
    } catch (error) {
      console.log(error);
      handleError({
        error,
        title: project.favorite ? "Unable to remove from favorites" : "Unable to add to favorites",
      });
    }
  }

  async function deleteProject(id: number) {
    if (await confirmAlert({ title: "Are you sure you want to delete this project?" })) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

      try {
        await todoist.deleteProject(id);
        await showToast({ style: Toast.Style.Success, title: "Project deleted" });
        mutate(SWRKeys.projects);
      } catch (error) {
        handleError({ error, title: "Unable to delete project" });
      }
      mutate(SWRKeys.projects);
    }
  }

  return (
    <List searchBarPlaceholder="Filter projects by name..." isLoading={!data && !error}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={project.inboxProject ? Icon.Envelope : { source: Icon.List, tintColor: getColor(project.color).value }}
          title={project.name}
          {...(project.favorite ? { accessoryIcon: { source: Icon.Star, tintColor: Color.Yellow } } : {})}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.TextDocument} title="Show Details" target={<Project projectId={project.id} />} />

              {!project.inboxProject ? (
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Project"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<ProjectForm project={project} />}
                  />

                  <Action
                    title={project.favorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => toggleFavorite(project)}
                  />

                  <Action
                    title="Delete Project"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteProject(project.id)}
                  />
                </ActionPanel.Section>
              ) : null}

              <ActionPanel.Section>
                <Action.OpenInBrowser url={project.url} shortcut={{ modifiers: ["cmd"], key: "enter" }} />

                <Action.CopyToClipboard
                  title="Copy Project URL"
                  content={project.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
