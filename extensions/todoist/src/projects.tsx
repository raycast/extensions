import { ActionPanel, PushAction, Icon, List, OpenInBrowserAction, confirmAlert, render } from "@raycast/api";
import { mutate } from "swr";
import { deleteProject as apiDeleteProject, getProjects, handleError } from "./api";
import Project from "./components/Project";
import { SWRKeys } from "./types";

function Projects() {
  const { data, error } = getProjects();

  if (error) {
    handleError({ error, title: "Failed to get projects" });
  }

  const projects = data || [];

  async function deleteProject(id: number) {
    if (await confirmAlert({ title: "Are you sure you want to delete this project?" })) {
      await apiDeleteProject(id);
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
