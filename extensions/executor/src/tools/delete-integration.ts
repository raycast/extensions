import type { Tool } from "@raycast/api";
import { deleteExecutorItem, deletionConfirmation } from "../lib/deletions";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces. */
  workspaceId: string;
  /** Exact slug from list-integrations. Only integrations with canRemove: true can be deleted. */
  integration: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () =>
    deletionConfirmation({ kind: "integration", integration: input.integration }),
  );

/** Permanently delete an integration and its connections/tools only on explicit request. Never delete an integration when the user asked to remove just one connection. Do not retry an uncertain deletion. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () =>
    deleteExecutorItem({ kind: "integration", integration: input.integration }),
  );
}
