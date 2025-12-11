import { List } from "@raycast/api";
import { useMemo } from "react";

import { TaskListItem } from "./components/tasks/TaskListItem";
import { EXTENSION_ICON } from "./constants";
import { TasksProvider } from "./contexts/TasksContext";
import { useAllTasks } from "./hooks/useAllTasks";
import { flattenTasksWithDepth } from "./utils/task-helpers";

export default function ListTasks() {
  const { error, isLoading, tasks, updateTaskStatus } = useAllTasks();

  const tasksWithDepth = useMemo(() => flattenTasksWithDepth(tasks), [tasks]);

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load tasks" />
      </List>
    );
  }

  return (
    <TasksProvider tasks={tasks} updateTaskStatus={updateTaskStatus}>
      <List isLoading={isLoading} navigationTitle="List Tasks">
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView
            description="No tasks in this list"
            icon={{ source: EXTENSION_ICON }}
            title="No tasks found"
          />
        )}
        {tasksWithDepth.map(({ depth, task }) => (
          <TaskListItem depth={depth} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}
