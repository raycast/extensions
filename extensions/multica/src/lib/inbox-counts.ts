import { getUnreadInboxSummary, listWorkspaces } from "./api";
import type { Workspace } from "./types";

export interface WorkspaceUnread {
  workspace: Workspace;
  count: number;
}

/** Unread inbox count for each of the user's workspaces, in workspace order. */
export async function fetchInboxCounts(): Promise<WorkspaceUnread[]> {
  const workspaces = await listWorkspaces();
  if (!workspaces.length) return [];
  const summary = await getUnreadInboxSummary(workspaces[0].id);
  const counts = new Map(summary.map((row) => [row.workspace_id, row.count]));
  return workspaces.map((workspace) => ({ workspace, count: counts.get(workspace.id) ?? 0 }));
}

export function totalUnread(counts: WorkspaceUnread[]): number {
  return counts.reduce((sum, { count }) => sum + count, 0);
}
