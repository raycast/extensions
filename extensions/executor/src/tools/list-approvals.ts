import { accountCacheKey } from "../lib/client";
import { listPendingApprovals } from "../lib/pending-approvals";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = { workspaceId?: string; offset?: number; limit?: number };

/** List local references to pauses started through this extension. Use get-approval for live terms; this is not an all-client server approval inbox. */
export default function tool(input: Input = {}) {
  return inAiWorkspace(input, async () => {
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("Use a non-negative integer offset and a limit from 1 to 100.");
    const approvals = await listPendingApprovals(accountCacheKey());
    return {
      approvals: approvals.slice(offset, offset + limit),
      total: approvals.length,
      nextOffset: offset + limit < approvals.length ? offset + limit : undefined,
    };
  });
}
