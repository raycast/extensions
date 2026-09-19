import { TaskList } from "./components/TaskList";

export default function Upcoming() {
  return <TaskList source={{ kind: "scope", scope: "upcoming" }} />;
}
