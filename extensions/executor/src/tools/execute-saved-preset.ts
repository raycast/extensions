import type { Tool } from "@raycast/api";
import { executeExecutorSavedTool, executeSavedToolConfirmation } from "../lib/saved-tools-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a saved-tool read. */
  workspaceId: string;
  /** Exact preset ID returned by list-saved-tools. */
  savedToolId: string;
  /** Exact fingerprint returned with the preset by list-saved-tools or get-saved-tool. */
  savedToolFingerprint: string;
  /** Include the complete response envelope for inspection or export. Default false. */
  includeFullResponse?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => executeSavedToolConfirmation(input));

/** Run one exact saved preset through Executor with its current server policy and pause boundaries. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => executeExecutorSavedTool(input));
}
