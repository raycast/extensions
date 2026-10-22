import { accountCacheKey, defaultOwner, listConnections } from "./client";
import { listDisplayIntegrations } from "./integration-display";
import { listPendingApprovals } from "./pending-approvals";
import { buildStatusSnapshot } from "./status";
import { resolveWorkspace, runInWorkspace, workspaceSummary } from "./workspaces";

export async function loadWorkspaceStatus(id: string) {
  const workspace = await resolveWorkspace(id);
  return runInWorkspace(workspace, async () => {
    const [connections, approvals, integrations] = await Promise.allSettled([
      listConnections({ owner: defaultOwner() }, AbortSignal.timeout(15000)),
      listPendingApprovals(accountCacheKey()),
      listDisplayIntegrations(AbortSignal.timeout(15000)),
    ]);
    const error = connections.status === "rejected" ? new Error("Could not load saved connection health.") : undefined;
    return {
      workspace: workspaceSummary(workspace),
      integrations: integrations.status === "fulfilled" ? integrations.value : [],
      snapshot: buildStatusSnapshot(connections.status === "fulfilled" ? connections.value : [], error),
      approvals: approvals.status === "fulfilled" ? approvals.value : [],
      approvalsUnavailable: approvals.status === "rejected",
    };
  });
}
