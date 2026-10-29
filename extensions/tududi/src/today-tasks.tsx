import { TaskListView } from "./components/TaskListView";
import { fetchTodayTasks } from "./lib/api";

export default function Command() {
  return <TaskListView fetchTasks={fetchTodayTasks} emptyTitle="Nothing in today's plan" />;
}
