import { listAiPolicies } from "../lib/policy-ai";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Workspace ID or unique read-only alias. Required with multiple profiles. */
  workspaceId?: string;
  query?: string;
  /** user means Personal scope; org means Workspace scope. Omit for both. */
  owner?: "user" | "org";
  /** 1 to 100; defaults to 50. */
  limit?: number;
  offset?: number;
};

/** Read current policies and fingerprints before reviewing changes. Executor owns rule precedence. */
export default function tool(input: Input = {}) {
  return inAiWorkspace(input, () => listAiPolicies(input));
}
