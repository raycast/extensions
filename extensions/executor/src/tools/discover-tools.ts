import { discoverExecutorTools } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces, such as personal or work. Required when multiple workspaces are configured. */
  workspaceId?: string;
  /** Search words for tool name, address, or description. Required unless integration is provided. */
  query?: string;
  /** Exact Executor integration slug. Required unless query is provided. */
  integration?: string;
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
};

/**
 * Search the catalog for a standalone lookup. For multi-step workflows, prefer tools.search inside execute-code and inspect unfamiliar schemas there.
 */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => discoverExecutorTools(input));
}
