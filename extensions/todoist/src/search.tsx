import useSWR from "swr";
import React from "react";
import { List } from "@raycast/api";
import { Task } from "@doist/todoist-api-typescript";
import { handleError, todoist } from "./api";
import { SWRKeys, ViewMode } from "./types";
import TaskListItem from "./components/TaskListItem";

export default function Search() {
  const { data: tasks, error: getTasksError } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ filter: "all" }));
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());

  const [filteredTasks, setFilteredTasks] = React.useState<Task[]>([]);
  const [projectId, setProjectId] = React.useState("");

  const placeholder = "Filter tasks by name, priority (e.g p1), or project name (e.g Work)";

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getTasksError) {
    handleError({ error: getTasksError, title: "Unable to get tasks" });
  }

  React.useEffect(() => {
    if (tasks) {
      setFilteredTasks(projectId ? tasks.filter((task) => task.projectId === parseInt(projectId)) : tasks);
    }
  }, [tasks, projectId]);

  const searchBarAccessory = (
    <List.Dropdown tooltip="Select project" onChange={(projectId) => setProjectId(projectId)}>
      <List.Dropdown.Item title="All tasks" value="" />

      {projects?.map((project) => {
        return <List.Dropdown.Item key={project.id} title={project.name} value={String(project.id)} />;
      })}
    </List.Dropdown>
  );

  return (
    <List
      searchBarPlaceholder={placeholder}
      {...(projects ? { searchBarAccessory } : {})}
      isLoading={(!tasks && !getTasksError) || (!projects && !getProjectsError)}
    >
      {filteredTasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          mode={projectId ? ViewMode.project : ViewMode.search}
          {...(projects ? { projects } : {})}
        />
      ))}
    </List>
  );
}
