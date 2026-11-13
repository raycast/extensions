import type { Tool } from "@raycast/api";
import { checkExecutorConnection, connectionActionConfirmation } from "../lib/connection-ai";
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
  confirmInRequiredAiWorkspace(input, () => connectionActionConfirmation(input, "health"));

/** Run and persist a fresh health check for one exact Executor connection. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => checkExecutorConnection(input));
}
