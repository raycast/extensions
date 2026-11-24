import type { Tool } from "@raycast/api";
import { executeCodeConfirmation, executeExecutorCode } from "../lib/ai-tools";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact ID returned by list-workspaces. */
  workspaceId: string;
  /** TypeScript code. Batch discovery with tools.search, inspect schemas with tools.describe.tool, then call exact tools[path](args). Return compact results and check each call's ok flag. */
  code: string;
  /** Include the complete response envelope for inspection or export. Default false. */
  includeFullResponse?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmInRequiredAiWorkspace(input, () => executeCodeConfirmation(input));

/**
 * Preferred for multi-step connected-service work. Batch discovery, schema inspection, independent reads, pagination, and aggregation in Executor's native code mode. Existing approval policies remain active.
 */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => executeExecutorCode(input));
}
