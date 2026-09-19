import type { Tool } from "@raycast/api";
import { updateConnectionConfirmation, updateExecutorConnection } from "../lib/connection-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a read result. */
  workspaceId: string;
  /** Exact connection owner returned by list-connections. */
  owner: "org" | "user";
  /** Exact integration slug returned by list-connections. */
  integration: string;
  /** Exact connection name returned by list-connections. */
  connection: string;
  /** New display label. Omit to keep it unchanged; an empty string clears it. */
  label?: string;
  /** New description. Omit to keep it unchanged; an empty string clears it. */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => updateConnectionConfirmation(input));

/** Update the label or description of one exact Executor connection. Credentials and its stable address stay unchanged. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => updateExecutorConnection(input));
}
