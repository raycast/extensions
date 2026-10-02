import type { Tool } from "@raycast/api";
import { removeExecutorSavedTool, removeSavedToolConfirmation } from "../lib/saved-tools-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a saved-tool read. */
  workspaceId: string;
  /** Exact saved tool ID returned by list-saved-tools. */
  savedToolId: string;
  /** Exact fingerprint returned with the saved tool by list-saved-tools or get-saved-tool. */
  savedToolFingerprint: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => removeSavedToolConfirmation(input));

/** Remove one exact local Executor favorite or preset. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => removeExecutorSavedTool(input));
}
