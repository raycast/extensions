import { currentWorkspace } from "../lib/workspaces";
import { loadWorkspaceStatus } from "../lib/workspace-status";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = { workspaceId?: string };

/** Read the status menu's recorded health summary and local approval count. Does not probe providers or run background tools. */
export default function tool(input: Input = {}) {
  return inAiWorkspace(input, async () => {
    const status = await loadWorkspaceStatus(currentWorkspace()!.id);
    const { repairConnections, ...summary } = status.snapshot;
    return {
      ...summary,
      approvals: status.approvals.length,
      approvalsUnavailable: status.approvalsUnavailable,
      repairConnections: repairConnections.slice(0, 50).map((item) => ({
        address: item.address,
        integration: item.integration,
        owner: item.owner,
        name: item.name,
        identityLabel: item.identityLabel,
        lastHealth: item.lastHealth,
        missingOAuthScopes: item.missingOAuthScopes,
      })),
      truncated: repairConnections.length > 50,
      nextStep: "Use list-connections for more detail. Health is recorded status, not a live provider check.",
    };
  });
}
