export { confirmation } from "../tools";
import { call } from "../tools";
export default function tool(input: {
  workspaceId: string;
  title: string;
  productId?: string;
  content?: string;
  docType?: string;
  status?: "draft" | "active" | "review";
}) {
  return call("documents/create", input);
}
