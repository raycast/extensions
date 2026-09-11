import { TasksView } from "./tasks";

export default function ShowCompleted() {
  return <TasksView initialPreset="completed" />;
}
