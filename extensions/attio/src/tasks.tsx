import { useCachedPromise } from "@raycast/utils";
import { attio } from "./attio";
import { List } from "@raycast/api";

export default function Tasks() {
  const {
    isLoading,
    data: tasks,
    error,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.tasks.list({});
      return data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !tasks.length && !error ? (
        <List.EmptyView icon="empty/task.svg" title="Tasks" description="No tasks yet!" />
      ) : (
        tasks.map((task) => <List.Item key={task.id.taskId} title={task.id.taskId} />)
      )}
    </List>
  );
}
