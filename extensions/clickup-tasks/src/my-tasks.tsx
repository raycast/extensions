import { List } from "@raycast/api";
import { useMemo } from "react";
import { TaskListItem } from "./components/tasks/TaskListItem";
import { EXTENSION_ICON } from "./constants";
import { TasksProvider } from "./contexts/TasksContext";
import { useMyTasks } from "./hooks/useMyTasks";
import { flattenTasksWithDepthAndContext } from "./utils/task-helpers";

export default function () {
  const { assignedTaskIds, error, isLoading, tasks, userName } = useMyTasks();

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load tasks" />
      </List>
    );
  }

  const tasksWithContext = useMemo(
    () => flattenTasksWithDepthAndContext(tasks, assignedTaskIds),
    [tasks, assignedTaskIds],
  );

  return (
    <TasksProvider tasks={tasks}>
      <List isLoading={isLoading} navigationTitle={userName ? `My Tasks - ${userName}` : "My Tasks"}>
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView
            description="You don't have any tasks assigned to you"
            icon={{ source: EXTENSION_ICON }}
            title="No tasks assigned to you"
          />
        )}
        {tasksWithContext.map(({ depth, isAssignedToUser, task }) => (
          <TaskListItem depth={depth} isAssignedToUser={isAssignedToUser} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}
