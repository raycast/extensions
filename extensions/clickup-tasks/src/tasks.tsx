import { List } from "@raycast/api";
import { useMemo } from "react";
import { TaskListItem } from "./components/tasks/TaskListItem";
import { EXTENSION_ICON } from "./constants";
import { TasksProvider } from "./contexts/TasksContext";
import { useTasks } from "./hooks/useTasks";
import { flattenTasksWithDepth } from "./utils/task-helpers";

export default function () {
  const { error, isLoading, tasks } = useTasks();

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load tasks" />
      </List>
    );
  }

  const tasksWithDepth = useMemo(() => flattenTasksWithDepth(tasks), [tasks]);

  return (
    <TasksProvider tasks={tasks}>
      <List isLoading={isLoading}>
        {tasksWithDepth.map(({ depth, task }) => (
          <TaskListItem depth={depth} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}
