import type { Tool } from "@raycast/api";
import { connectionActionConfirmation, reconnectExecutorConnection } from "../lib/connection-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a read result. */
  workspaceId: string;
  owner: "org" | "user";
  integration: string;
  /** Exact connection name returned by list-connections. */
  connection: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => connectionActionConfirmation(input, "reconnect"));

/** Reconnect one exact account through the same guarded OAuth or secure Executor browser flow as Manage Connections. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => reconnectExecutorConnection(input));
}
