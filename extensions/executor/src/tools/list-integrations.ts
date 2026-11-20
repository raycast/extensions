import { listExecutorIntegrations } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces, such as personal or work. Required when multiple workspaces are configured. */
  workspaceId?: string;
};

/** List the integrations configured on this Executor account. */
export default function tool(input: Input = {}) {
  return inAiWorkspace(input, () => listExecutorIntegrations());
}
