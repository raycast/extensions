import { List } from "@raycast/api";
import { Fragment, useMemo } from "react";
import { TaskListItem } from "./components/tasks/TaskListItem";
import { EXTENSION_ICON } from "./constants";
import { TasksProvider } from "./contexts/TasksContext";
import { useMyTasks } from "./hooks/useMyTasks";
import { groupTasksWithSubtasks } from "./utils/task-helpers";

export default function () {
  const { error, isLoading, tasks, userName } = useMyTasks();

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load tasks" />
      </List>
    );
  }
  const taskGroups = useMemo(() => groupTasksWithSubtasks(tasks), [tasks]);

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
        {taskGroups.map((group) => (
          <Fragment key={group.parent.id}>
            <TaskListItem task={group.parent} />
            {group.subtasks.map((subtask) => (
              <TaskListItem key={`${group.parent.id}_${subtask.id}`} task={subtask} />
            ))}
          </Fragment>
        ))}
      </List>
    </TasksProvider>
  );
}
