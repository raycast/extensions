import { useTasks } from "../../hooks/useTasks";
import { List } from "@raycast/api";
import { Task } from "./Task";

function ListTasks({ listId, listName }: { listId: string; listName: string }) {
  const { isLoading, tasks } = useTasks(listId);
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

export { ListTasks };
