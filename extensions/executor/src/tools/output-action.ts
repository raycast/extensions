import type { Tool } from "@raycast/api";
import { outputActionConfirmation, performOutputAction, type OutputOperation } from "../lib/output-actions";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or the source result. */
  workspaceId: string;
  /** Explicit user-requested output action. */
  operation: OutputOperation;
  /** Exact text or JSON content to copy or export. JSON operations validate and pretty-print this string. */
  content: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => outputActionConfirmation(input));

/** Copy explicitly requested text or JSON to the clipboard, or export JSON to Executor's private exports directory. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => performOutputAction(input));
}
