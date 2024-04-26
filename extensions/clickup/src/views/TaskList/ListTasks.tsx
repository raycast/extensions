import { useTasks } from "../../hooks/useTasks";
import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { TaskDetail } from "../TaskDetail";
import { Task } from "./Task";

function ListTasks({ listId, listName }: { listId: string; listName: string }) {
  const tasks = useTasks(listId);
  return (
    <List throttle={true} isLoading={tasks === undefined} navigationTitle={`${listName} Lists`}>
      {tasks?.map((task) => (
        <Task task={task} key={task.id} />
      ))}
    </List>
  );
}

export { ListTasks };
