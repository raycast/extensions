import { planeClient } from "../api/auth";

export function useWorkspace() {
  const workspaceSlug = planeClient?.workspaceSlug;
  return {
    workspaceSlug,
  };
}
