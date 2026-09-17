import CreateTaskForm from "./components/CreateTaskForm";
import { createTask } from "./api/endpoints";

export default function Command() {
  return <CreateTaskForm onCreate={createTask} />;
}
