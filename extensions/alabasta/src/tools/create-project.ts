export { confirmation } from "../tools";
import { call } from "../tools";
export default function tool(input: {
  workspaceId: string;
  title: string;
  productId?: string;
  description?: string;
  status?: string;
  priority?: string;
  leadId?: string;
  startDate?: number;
  endDate?: number;
}) {
  return call("projects/create", {
    status: "planned",
    priority: "no_priority",
    ...input,
  });
}
