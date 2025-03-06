import Modify from "./components/Modify";
import { Task } from "./types/types";

// Returns the main React component for a view command
export default function Command() {
  // Create an empty task object to be used by the Modify component
  const emptyTask: Task = {
    uuid: "",
    description: "",
    entry: "",
    status: "",
    urgency: 0,
    priority: undefined,
    project: "",
    tags: new Set(),
    due: "",
  };

  return <Modify task={emptyTask} />;
}
