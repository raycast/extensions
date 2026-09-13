import { readExecutorApproval } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  workspaceId?: string;
  /** Exact execution ID from list-approvals or a paused execution. */
  executionId: string;
};

/** Read fresh server terms and fingerprint for one pending approval. Does not accept, decline, or resume it. */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => readExecutorApproval(input.executionId));
}
