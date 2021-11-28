import { ActionPanel, PushAction, Icon, List, OpenInBrowserAction, render } from "@raycast/api";
import { showApiToastError } from "./utils";

import { Project as TProject } from "./types";
import { useFetch } from "./api";

import Project from "./components/Project";

function Projects() {
  const { data, isLoading, error } = useFetch<TProject[]>("/projects");

  if (error) {
    showApiToastError({ error, title: "Failed to get projects", message: error.message });
  }

  const projects = data || [];

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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

render(<Projects />);
