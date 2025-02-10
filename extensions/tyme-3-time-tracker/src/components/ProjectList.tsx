import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../tasks";
import { showErrorHUD } from "../utils";
import { TaskList } from "./TaskList";
import { CreateProject } from "./CreateProject";

export function ProjectList() {
  const [searchText, setSearchText] = useState("");

  const { data: projects = [], isLoading } = useCachedPromise(getProjects, [], {
    keepPreviousData: true,
    onError: (error) => showErrorHUD("loading projects", error),
  });

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(searchText.toLowerCase())),
    [projects, searchText]
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or create a project..."
      navigationTitle="Projects"
    >
      {filteredProjects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push title="View Tasks" icon={Icon.List} target={<TaskList project={project} />} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title={searchText.trim() ? `Create project "${searchText}"` : "No Projects Found"}
        description={
          searchText.trim() ? "Press Enter to create this project" : "Type to search or create a new project"
        }
        icon={searchText.trim() ? Icon.PlusCircle : Icon.List}
        actions={
          <ActionPanel>
            {searchText.trim() && (
              <Action.Push title="Create Project" icon={Icon.PlusCircle} target={<CreateProject name={searchText} />} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
