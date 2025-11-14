import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getClickUpClient } from "../../api/clickup";
import { EXTENSION_ICON } from "../../constants";
import { TasksProvider } from "../../contexts/TasksContext";
import { ClickUpList } from "../../types/clickup";
import { flattenTasksWithDepth } from "../../utils/task-helpers";
import { TaskListItem } from "../tasks/TaskListItem";

interface Props {
  list: ClickUpList;
}

export function ListTasks({ list }: Props) {
  const fetchTasks = async (listId: string) => {
    const client = getClickUpClient();
    return await client.getAllTasksFromListRecursively(listId, { archived: false });
  };

  const { data: tasks = [], error, isLoading } = useCachedPromise(fetchTasks, [list.id]);

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List navigationTitle={list.name}>
        <List.EmptyView
          description={error instanceof Error ? error.message : String(error)}
          icon={{ source: EXTENSION_ICON }}
          title="Failed to load tasks"
        />
      </List>
    );
  }

  const tasksWithDepth = useMemo(() => flattenTasksWithDepth(tasks), [tasks]);

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
        {tasksWithDepth.map(({ depth, task }) => (
          <TaskListItem depth={depth} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}
