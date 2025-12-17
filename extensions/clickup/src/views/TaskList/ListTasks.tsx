import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
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
    <List
      throttle={true}
      isLoading={isLoading}
      navigationTitle={`${listName} Lists`}
      searchBarPlaceholder="Search tasks"
    >
      <List.Section title={`Lists / ${listId}`} subtitle={`${tasks.length} tasks`}>
        {tasks.map((task) => (
          <Task task={task} key={task.id} />
        ))}
      </List.Section>
    </List>
  );
}
