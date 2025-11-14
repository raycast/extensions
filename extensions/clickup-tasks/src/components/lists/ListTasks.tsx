import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useMemo } from "react";
import { getClickUpClient } from "../../api/clickup";
import { EXTENSION_ICON } from "../../constants";
import { TasksProvider } from "../../contexts/TasksContext";
import { ClickUpList } from "../../types/clickup";
import { groupTasksWithSubtasks } from "../../utils/task-helpers";
import { TaskListItem } from "../tasks/TaskListItem";

interface Props {
  list: ClickUpList;
}

export function ListTasks({ list }: Props) {
  const fetchTasks = async () => {
    const client = getClickUpClient();
    return await client.getAllTasksFromList(list.id, { archived: false, subtasks: true });
  };

  const { data: tasks = [], error, isLoading } = useCachedPromise(fetchTasks, [list.id]);

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List navigationTitle={list.name}>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load tasks" />
      </List>
    );
  }

  const taskGroups = useMemo(() => groupTasksWithSubtasks(tasks), [tasks]);

  return (
    <TasksProvider tasks={tasks}>
      <List isLoading={isLoading} navigationTitle={list.name}>
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView
            description="This list has no tasks"
            icon={{ source: EXTENSION_ICON }}
            title="No tasks found"
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
