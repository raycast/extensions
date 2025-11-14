import { List } from "@raycast/api";
import { Fragment, useMemo } from "react";
import { TaskListItem } from "./components/tasks/TaskListItem";
import { EXTENSION_ICON } from "./constants";
import { TasksProvider } from "./contexts/TasksContext";
import { useTasks } from "./hooks/useTasks";
import { groupTasksWithSubtasks } from "./utils/task-helpers";

export default function () {
  const { error, isLoading, tasks } = useTasks();

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
      <List isLoading={isLoading}>
        {taskGroups.map((group) => (
          <Fragment key={group.parent.id}>
            <TaskListItem key={group.parent.id} task={group.parent} />
            {group.subtasks.map((subtask) => (
              <TaskListItem key={subtask.id} task={subtask} />
            ))}
          </Fragment>
        ))}
      </List>
    </TasksProvider>
  );
}
