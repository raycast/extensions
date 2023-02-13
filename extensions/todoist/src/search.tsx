import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React from "react";

import { handleError, todoist } from "./api";
import TaskListItem from "./components/TaskListItem";
import View from "./components/View";
import { ViewMode } from "./constants";
import { getProjectIcon } from "./helpers/projects";

function Search() {
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: getTasksError,
    mutate: mutateTasks,
  } = useCachedPromise(() => todoist.getTasks({ filter: "all" }));

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: getProjectsError,
  } = useCachedPromise(() => todoist.getProjects());

  const [projectId, setProjectId] = React.useState("");

  const placeholder = "Filter tasks by name, priority (e.g p1), or project name (e.g Work)";

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getTasksError) {
    handleError({ error: getTasksError, title: "Unable to get tasks" });
  }

  const filteredTasks = React.useMemo(() => {
    if (!tasks) {
      return [];
    }

    return projectId ? tasks.filter((task) => task.projectId === projectId) : tasks;
  }, [tasks, projectId]);

  const searchBarAccessory = (
    <List.Dropdown tooltip="Select project" onChange={(projectId) => setProjectId(projectId)}>
      <List.Dropdown.Item title="All tasks" value="" icon={Icon.BulletPoints} />

      {projects?.map((project) => {
        return (
          <List.Dropdown.Item key={project.id} title={project.name} value={project.id} icon={getProjectIcon(project)} />
        );
      })}
    </List.Dropdown>
  );

  return (
    <List
      searchBarPlaceholder={placeholder}
      {...(projects ? { searchBarAccessory } : {})}
      isLoading={isLoadingTasks || isLoadingProjects}
    >
      {filteredTasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          mode={projectId ? ViewMode.project : ViewMode.search}
          mutateTasks={mutateTasks}
          {...(projects ? { projects } : {})}
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Search />
    </View>
  );
}
