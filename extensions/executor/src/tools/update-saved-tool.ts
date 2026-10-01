import type { Tool } from "@raycast/api";
import { updateExecutorSavedTool, updateSavedToolConfirmation } from "../lib/saved-tools-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a saved-tool read. */
  workspaceId: string;
  /** Exact favorite or preset ID returned by list-saved-tools. */
  savedToolId: string;
  /** Exact fingerprint returned with the saved tool by list-saved-tools or get-saved-tool. */
  savedToolFingerprint: string;
  /** New non-blank title. Omit to keep the current title. */
  title?: string;
  /** New preset arguments as a JSON object string. Omit to keep current inputs. Favorites cannot store inputs. */
  argumentsJson?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => updateSavedToolConfirmation(input));

/** Update the title of one exact local favorite, or the title and inputs of one exact local preset. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => updateExecutorSavedTool(input));
}
