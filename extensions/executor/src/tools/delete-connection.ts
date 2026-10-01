import type { Tool } from "@raycast/api";
import { deleteExecutorItem, deletionConfirmation } from "../lib/deletions";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces. */
  workspaceId: string;
  /** Exact owner returned by list-connections. */
  owner: "org" | "user";
  /** Exact integration slug returned by list-connections. */
  integration: string;
  /** Exact connection name returned by list-connections, not its display label. */
  connection: string;
};

function target(input: Input) {
  return {
    kind: "connection" as const,
    owner: input.owner,
    integration: input.integration,
    connection: input.connection,
  };
}

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => deletionConfirmation(target(input)));

/** Permanently delete one exact connection only on explicit request. Its tools lose access. Does not delete the integration or other connections. Do not retry an uncertain deletion. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => deleteExecutorItem(target(input)));
}
