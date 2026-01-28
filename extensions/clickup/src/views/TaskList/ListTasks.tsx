import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
import { TasksProvider } from "../../contexts/TasksContext";
import { Task } from "./Task";

interface Props {
  listId: string;
  listName: string;
}

export function ListTasks({ listId, listName }: Props) {
  const { isLoading, data: tasks } = useCachedPromise(async (id: string) => getClickUpClient().getTasks(id), [listId], {
    initialData: [],
  });

  return (
    <TasksProvider tasks={tasks}>
      <List throttle={true} isLoading={isLoading} navigationTitle={listName} searchBarPlaceholder="Search tasks">
        <List.Section title={listName} subtitle={`${tasks.length} tasks`}>
          {tasks.map((task) => (
            <Task key={task.id} task={task} />
          ))}
        </List.Section>
      </List>
    </TasksProvider>
  );
}
