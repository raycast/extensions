import type { Tool } from "@raycast/api";
import { saveExecutorFavorite, saveFavoriteConfirmation } from "../lib/saved-tools-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces. */
  workspaceId: string;
  /** Exact address returned by discover-tools. */
  address: string;
  /** Optional local display title. Defaults to the tool name. */
  title?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => saveFavoriteConfirmation(input));

/** Save one exact Executor tool as a workspace-scoped local favorite. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => saveExecutorFavorite(input));
}
