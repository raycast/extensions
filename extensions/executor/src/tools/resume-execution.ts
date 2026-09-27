import type { Tool } from "@raycast/api";
import { resumeExecutionConfirmation, resumeExecutorExecution } from "../lib/ai-tools";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact workspace ID returned with the paused execution. */
  workspaceId: string;
  /** Exact execution identifier returned by a paused Executor call. */
  executionId: string;
  /** Fingerprint returned with the same paused execution. */
  pauseFingerprint: string;
  /** Human decision for this paused execution. */
  action: "accept" | "decline" | "cancel";
  /** JSON object matching requestedSchema when the pause asks for input. */
  contentJson?: string;
  /** Include the complete response envelope for inspection or export. Default false. */
  includeFullResponse?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmInRequiredAiWorkspace(input, () => resumeExecutionConfirmation(input));

/**
 * Resume one paused Executor execution after re-reading and confirming its exact current server-stored terms. Never reruns the original call.
 */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => resumeExecutorExecution(input));
}
