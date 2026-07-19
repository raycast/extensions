export { confirmation } from "../tools";
import { call } from "../tools";
export default function tool(input: {
  workspaceId: string;
  taskId: string;
  body: string;
}) {
  return call("tasks/comment", input);
}
