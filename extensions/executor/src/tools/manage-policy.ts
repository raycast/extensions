import type { Tool } from "@raycast/api";
import { changeAiPolicy, policyChangeConfirmation } from "../lib/policy-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical ID returned by list-workspaces. */
  workspaceId: string;
  operation: "create" | "update" | "delete";
  /** user means Personal; org means Workspace scope. Existing policies cannot change scope. */
  owner: "user" | "org";
  /** Required for update/delete; returned by list-policies. */
  policyId?: string;
  /** Required for update/delete; use the exact fingerprint from list-policies. */
  policyFingerprint?: string;
  /** Required for create. Omit on update to preserve; do not provide on delete. */
  pattern?: string;
  /** approve = Always Run; require_approval = Require Approval; block = Block. Required for create. */
  action?: "approve" | "require_approval" | "block";
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => policyChangeConfirmation(input));

/** Create, edit, or delete a policy only when the user explicitly requests that policy change. Never alter a policy to get around a denied or paused operation. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => changeAiPolicy(input));
}
