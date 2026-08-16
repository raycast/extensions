import { loadTickTickAiToolRuntime } from "../bootstrap/commandBootstrap";
import { raycastTaskDestinationPreferences } from "../platform/RaycastTaskDestinationPreferences";
import { createAddTaskTool } from "./toolController";

type Input = {
  /** The task title. */
  title: string;
  /** The exact identifier of the destination list, when known. */
  projectId?: string;
  /** The name of the destination list, when the identifier is unknown. */
  projectName?: string;
  /** The due date as an ISO 8601 string. */
  dueDate?: string;
  /** Additional task notes. */
  content?: string;
};

const addTask = createAddTaskTool({
  loadRuntime: loadTickTickAiToolRuntime,
  preferences: raycastTaskDestinationPreferences,
});

export default async function (input: Input) {
  return addTask(input);
}
