import { TaskList } from "./components/TaskList";

export default function SearchTasks() {
  return <TaskList source={{ kind: "search" }} />;
}
