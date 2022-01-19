import { ActionPanel, PushAction, Icon, List, OpenInBrowserAction, confirmAlert, render } from "@raycast/api";
import { mutate } from "swr";

import { showApiToastError } from "./utils";

import { Project as TProject } from "./types";
import { deleteProject as apiDeleteProject, useFetch } from "./api";

import Project from "./components/Project";

function Projects() {
  const path = "/projects";
  const { data, isLoading, error } = useFetch<TProject[]>(path);

  if (error) {
    showApiToastError({ error, title: "Failed to get projects", message: error.message });
  }

  const projects = data || [];

  async function deleteProject(id: number) {
    if (await confirmAlert({ title: "Are you sure you want to delete this project?" })) {
      await apiDeleteProject(id);
      mutate(path);
    }
  }

  return (
    <List searchBarPlaceholder="Filter projects by name..." isLoading={isLoading}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={project.inbox_project ? Icon.Envelope : Icon.List}
          title={project.name}
          {...(project.favorite ? { accessoryIcon: Icon.Star } : {})}
          actions={
            <ActionPanel>
              <PushAction icon={Icon.TextDocument} title="Show Details" target={<Project projectId={project.id} />} />
              <OpenInBrowserAction url={project.url} />
              <ActionPanel.Item
                title="Delete Project"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
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
