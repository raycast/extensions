import { describeExecutorTool } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces, such as personal or work. Required when multiple workspaces are configured. */
  workspaceId?: string;
  /** Exact address returned by discover-tools. */
  address: string;
};

/** Inspect one exact tool schema. For several schemas, batch tools.describe.tool calls inside execute-code. */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => describeExecutorTool(input));
}
