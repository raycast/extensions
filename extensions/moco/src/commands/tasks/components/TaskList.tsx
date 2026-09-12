import { List } from "@raycast/api";
import { Project } from "../../projects/types";
import { Task } from "../types";
import { TaskListItem } from "./TaskListItem";

export const TaskList = ({ project }: { project: Project }) => {
  const tasks = project.tasks.map((task: Task) => {
    return {
      ...task,
      projectID: project.id,
      projectName: project.name,
    };
  });

  return (
    <List navigationTitle={project.name} searchBarPlaceholder="Filter tasks by name..." isShowingDetail={false}>
      {tasks
        .filter((task) => task.active)
        .map((task, index) => (
          <TaskListItem key={index} task={task} />
        ))}
    </List>
  );
};
