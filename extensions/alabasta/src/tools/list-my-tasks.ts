import { call } from "../tools";
export default function tool(input: { workspaceId: string }) {
  return call("tasks/mine", input);
}
