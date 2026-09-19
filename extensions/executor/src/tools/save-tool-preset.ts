import type { Tool } from "@raycast/api";
import { saveExecutorPreset, savePresetConfirmation } from "../lib/saved-tools-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces. */
  workspaceId: string;
  /** Exact address returned by discover-tools. */
  address: string;
  /** Local preset title. */
  title: string;
  /** Saved tool arguments as a JSON object string. */
  argumentsJson: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => savePresetConfirmation(input));

/** Save reviewed inputs for one exact Executor tool as a workspace-scoped local preset. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => saveExecutorPreset(input));
}
