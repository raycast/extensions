import { listExecutorSavedTools } from "../lib/saved-tools-ai";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces. */
  workspaceId?: string;
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
};

/** List local favorites and input presets for this exact Executor workspace with bounded output. */
export default function tool(input: Input = {}) {
  return inAiWorkspace(input, () => listExecutorSavedTools(input));
}
