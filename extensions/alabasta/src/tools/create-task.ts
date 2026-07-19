export { confirmation } from "../tools";
import { call } from "../tools";
export default function tool(input: {
  workspaceId: string;
  productId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  labelIds?: string[];
  dueDate?: number;
}) {
  return call("tasks/create", {
    status: "todo",
    priority: "no_priority",
    ...input,
  });
}
