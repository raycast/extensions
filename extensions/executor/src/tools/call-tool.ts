import type { Tool } from "@raycast/api";
import { callExecutorTool, callToolConfirmation } from "../lib/ai-tools";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact ID returned by list-workspaces. */
  workspaceId: string;
  /** Exact address returned by discover-tools. */
  address: string;
  /** Tool arguments as a JSON object string. Use "{}" when the tool takes no arguments. */
  argumentsJson: string;
  /** Include the complete response envelope for inspection or export. Default false to keep results compact. */
  includeFullResponse?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmInRequiredAiWorkspace(input, () => callToolConfirmation(input));

/**
 * Call one already-described tool with JSON object arguments. Prefer execute-code for multi-call workflows. Executor policies remain active and may pause execution.
 */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => callExecutorTool(input));
}
