import {
  ActionPanel,
  PushAction,
  Icon,
  showToast,
  ToastStyle,
  List,
  OpenInBrowserAction,
  confirmAlert,
  render,
} from "@raycast/api";
import useSWR, { mutate } from "swr";
import { todoist, handleError } from "./api";
import Project from "./components/Project";
import { SWRKeys } from "./types";

function Projects() {
  const { data, error } = useSWR(SWRKeys.projects, () => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const projects = data || [];

  async function deleteProject(id: number) {
    if (await confirmAlert({ title: "Are you sure you want to delete this project?" })) {
      await showToast(ToastStyle.Animated, "Deleting project");

      try {
        await todoist.deleteProject(id);
        await showToast(ToastStyle.Success, "Project deleted");
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
              <PushAction icon={Icon.TextDocument} title="Show Details" target={<Project projectId={project.id} />} />
              <OpenInBrowserAction url={project.url} />
              <ActionPanel.Item
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

render(<Projects />);
