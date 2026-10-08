import { getExecutorSavedTool } from "../lib/saved-tools-ai";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces. */
  workspaceId?: string;
  /** Exact saved tool ID returned by list-saved-tools. */
  savedToolId: string;
};

/** Read one exact local Executor favorite or preset, including saved inputs when present. */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => getExecutorSavedTool(input));
}
