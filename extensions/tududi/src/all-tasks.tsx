import { TaskListView } from "./components/TaskListView";
import { fetchAllTasks } from "./lib/api";

export default function Command() {
  return <TaskListView fetchTasks={fetchAllTasks} emptyTitle="No tasks found" />;
}
