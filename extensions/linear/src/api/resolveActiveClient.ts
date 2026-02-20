import { setActiveClient, fetchOAuthWorkspaceId, createLinearClient } from "./linearClient";
import { getActiveWorkspaceId, getStoredWorkspaces } from "./workspaces";

/**
 * Resolves the active workspace and sets the appropriate LinearClient.
 * Called by View.tsx for view commands, and directly in no-view commands.
 */
export async function resolveActiveClient(): Promise<void> {
  const activeWorkspaceId = await getActiveWorkspaceId();
  const oauthWorkspaceId = await fetchOAuthWorkspaceId();

  if (activeWorkspaceId && activeWorkspaceId !== oauthWorkspaceId) {
    const workspaces = await getStoredWorkspaces();
    const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
    if (workspace?.type === "pat" && workspace.pat) {
      setActiveClient(createLinearClient(workspace.pat, "pat"));
      return;
    }
  }

  // Default to OAuth client
  setActiveClient(null);
}
