export { confirmation } from "../tools";
import { call } from "../tools";
export default function tool(input: {
  workspaceId: string;
  taskId: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  labelIds?: string[];
  projectId?: string;
  dueDate?: number;
}) {
  return call("tasks/update", input);
}
