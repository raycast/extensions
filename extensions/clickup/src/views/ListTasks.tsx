import { useTasks } from "../hooks/useTasks";
import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { TaskDetail } from "./TaskDetail";

function ListTasks({ listId, listName }: { listId: string; listName: string }) {
  const tasks = useTasks(listId);
  return (
    <List throttle={true} isLoading={tasks === undefined} navigationTitle={`${listName} Lists`}>
      {tasks?.map((task) => (
        <List.Item
          key={task.id}
          title={task.name}
          subtitle={task.description?.substring(0, 50)}
          icon={
            task.description
              ? { source: Icon.TextDocument, tintColor: task.priority?.color }
              : { source: Icon.Dot, tintColor: task.priority?.color }
          }
          actions={
            <ActionPanel title="List Actions">
              <PushAction title="List Tasks" target={<TaskDetail task={task} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export { ListTasks };
