import type { Tool } from "@raycast/api";
import { changeAiWorkspace, workspaceChangeConfirmation } from "../lib/workspace-management-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID, never an alias. */
  workspaceId: string;
  operation: "rename" | "update" | "switch" | "verify" | "remove";
  /** Required only for rename. */
  name?: string;
  /** Optional for update: all connections, Personal (user), or Workspace (org). */
  defaultOwner?: "all" | "user" | "org";
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => workspaceChangeConfirmation(input));

/** Manage a local profile only on explicit request. Switch changes the native command default, not AI targeting. To add a profile or edit preference credentials, use open-executor-view. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => changeAiWorkspace(input));
}
