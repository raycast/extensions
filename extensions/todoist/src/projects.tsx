import { getColor, Project as TProject } from "@doist/todoist-api-typescript";
import { ActionPanel, Icon, showToast, Toast, List, confirmAlert, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { todoist, handleError } from "./api";
import Project from "./components/Project";
import ProjectForm from "./components/ProjectForm";

export default function Projects() {
  const { data, error, isLoading, mutate } = useCachedPromise(() => todoist.getProjects());

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

      mutate();
    } catch (error) {
      console.log(error);
      handleError({
        error,
        title: project.favorite ? "Unable to remove from favorites" : "Unable to add to favorites",
      });
    }
  }

  async function deleteProject(id: number) {
    if (
      await confirmAlert({
        title: "Delete Project",
        message: "Are you sure you want to delete this project?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting project" });

      try {
        await todoist.deleteProject(id);
        await showToast({ style: Toast.Style.Success, title: "Project deleted" });
        mutate();
      } catch (error) {
        handleError({ error, title: "Unable to delete project" });
      }
    }
  }

  return (
    <List searchBarPlaceholder="Filter projects by name..." isLoading={isLoading}>
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
                    target={<ProjectForm project={project} mutate={mutate} />}
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
                    style={Action.Style.Destructive}
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
