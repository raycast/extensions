import { getColorByKey, Project as TProject } from "@doist/todoist-api-typescript";
import { ActionPanel, Icon, showToast, Toast, List, confirmAlert, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { todoist, handleError } from "./api";
import Project from "./components/Project";
import ProjectForm from "./components/ProjectForm";
import View from "./components/View";
import { isTodoistInstalled } from "./helpers/isTodoistInstalled";

function Projects() {
  const { data, error, isLoading, mutate } = useCachedPromise(() => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const projects = data || [];

  async function toggleFavorite(project: TProject) {
    await showToast({
      style: Toast.Style.Animated,
      title: project.isFavorite ? "Removing from favorites" : "Adding to favorites",
    });

    try {
      await todoist.updateProject(project.id, { name: project.name, isFavorite: !project.isFavorite });
      await showToast({
        style: Toast.Style.Success,
        title: project.isFavorite ? "Removed from favorites" : "Added to favorites",
      });

      mutate();
    } catch (error) {
      handleError({
        error,
        title: project.isFavorite ? "Unable to remove from favorites" : "Unable to add to favorites",
      });
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
          icon={
            project.isInboxProject
              ? Icon.Envelope
              : {
                  source: project.viewStyle === "list" ? Icon.List : Icon.BarChart,
                  tintColor: getColorByKey(project.color).hexValue,
                }
          }
          title={project.name}
          {...(project.isFavorite ? { accessoryIcon: { source: Icon.Star, tintColor: Color.Yellow } } : {})}
          actions={
            <ActionPanel title={project.name}>
              <Action.Push icon={Icon.BlankDocument} title="Show Details" target={<Project project={project} />} />

              {isTodoistInstalled ? (
                <Action.Open
                  title="Open Project in Todoist"
                  target={`todoist://project?id=${project.id}`}
                  icon="todoist.png"
                  application="Todoist"
                />
              ) : (
                <Action.OpenInBrowser
                  title="Open Task in Browser"
                  url={project.url}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}

              {!project.isInboxProject ? (
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Project"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<ProjectForm project={project} mutate={mutate} />}
                  />

                  <Action
                    title={project.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
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
                <Action.CopyToClipboard
                  title="Copy Project URL"
                  content={project.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />

                <Action.CopyToClipboard
                  title="Copy Project Title"
                  content={project.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
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
