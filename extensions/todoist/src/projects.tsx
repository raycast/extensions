import { ActionPanel, Icon, showToast, Toast, List, confirmAlert, Action } from "@raycast/api";
import useSWR, { mutate } from "swr";
import { todoist, handleError } from "./api";
import Project from "./components/Project";
import { SWRKeys } from "./types";

export default function Projects() {
  const { data, error } = useSWR(SWRKeys.projects, () => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const projects = data || [];

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
          icon={project.inboxProject ? Icon.Envelope : Icon.List}
          title={project.name}
          {...(project.favorite ? { accessoryIcon: Icon.Star } : {})}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.TextDocument} title="Show Details" target={<Project projectId={project.id} />} />
              <Action.OpenInBrowser url={project.url} />
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteProject(project.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
