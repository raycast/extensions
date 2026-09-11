import { accountCacheKey, defaultOwner, listConnections } from "./client";
import { listPendingApprovals } from "./pending-approvals";
import { buildStatusSnapshot } from "./status";
import { resolveWorkspace, runInWorkspace, workspaceSummary } from "./workspaces";

export async function loadWorkspaceStatus(id: string) {
  const workspace = await resolveWorkspace(id);
  return runInWorkspace(workspace, async () => {
    const [connections, approvals] = await Promise.allSettled([
      listConnections({ owner: defaultOwner() }, AbortSignal.timeout(15000)),
      listPendingApprovals(accountCacheKey()),
    ]);
    const error = connections.status === "rejected" ? new Error("Could not load saved connection health.") : undefined;
    return {
      workspace: workspaceSummary(workspace),
      snapshot: buildStatusSnapshot(connections.status === "fulfilled" ? connections.value : [], error),
      approvals: approvals.status === "fulfilled" ? approvals.value : [],
      approvalsUnavailable: approvals.status === "rejected",
    };
  });
}
