import { listExecutorArtifacts } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces, such as personal or work. Required when multiple workspaces are configured. */
  workspaceId?: string;
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
};

/** List saved Executor artifacts with bounded output. */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => listExecutorArtifacts(input));
}
