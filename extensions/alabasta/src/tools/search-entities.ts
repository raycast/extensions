import { call } from "../tools";
export default function tool(input: { workspaceId: string; query: string }) {
  return call("search", input);
}
