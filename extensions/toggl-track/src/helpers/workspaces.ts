import { Workspace } from "@/api";

export function getWorkspaceById(workspaces: Workspace[], workspaceId: Workspace["id"]) {
  return workspaces.find((workspace) => workspace.id === workspaceId);
}
