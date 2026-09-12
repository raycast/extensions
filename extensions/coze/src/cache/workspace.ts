import { WorkSpace } from "@coze/api";
import { getCache, setCache } from "./cache";

export const getWorkspaceCacheKey = (workspaceId: string) => {
  return `workspace_${workspaceId}`;
};

export const getWorkspaceCache = (workspaceId: string): WorkSpace | undefined => {
  if (!workspaceId) return undefined;
  return getCache<WorkSpace>(getWorkspaceCacheKey(workspaceId));
};

export const setWorkspaceCache = (workspaceId: string, workspace: WorkSpace) => {
  if (!workspaceId) return;
  setCache(getWorkspaceCacheKey(workspaceId), workspace);
};
