import { TaskList } from "./components/TaskList";

export default function Today() {
  return <TaskList source={{ kind: "scope", scope: "today" }} />;
}
