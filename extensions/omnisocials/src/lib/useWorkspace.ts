import { useEffect, useState } from "react";
import { getActiveWorkspace, getWorkspaces } from "./workspaces";
import { setActiveWorkspaceContext, getPreferences } from "./preferences";
import type { WorkspaceProfile } from "./types";

/**
 * Hook that loads the active workspace profile and sets it in the preferences context.
 * Returns { isLoading, hasWorkspace, workspaceName }.
 * Falls back to the global API key preference if no workspaces are configured.
 */
export function useWorkspace() {
  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null);
  const [hasAnyWorkspace, setHasAnyWorkspace] = useState(false);

  useEffect(() => {
    async function load() {
      const workspaces = await getWorkspaces();
      setHasAnyWorkspace(workspaces.length > 0);

      if (workspaces.length > 0) {
        const active = await getActiveWorkspace();
        if (active) {
          setActiveWorkspaceContext(active);
          setWorkspace(active);
        } else {
          // No active set but workspaces exist -- use first
          setActiveWorkspaceContext(workspaces[0]);
          setWorkspace(workspaces[0]);
        }
      } else {
        // No workspace profiles -- fall back to global preference
        setActiveWorkspaceContext(null);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const { apiKey } = getPreferences();
  const hasApiKey = hasAnyWorkspace || !!apiKey;
  const workspaceName = workspace?.name || (apiKey ? "Default" : null);
  const workspaceIcon = workspace?.icon || undefined;
  const navigationTitle = workspaceName
    ? `${workspaceIcon ? workspaceIcon + " " : ""}${workspaceName}`
    : undefined;

  return {
    isLoading,
    hasApiKey,
    workspaceName,
    workspaceIcon,
    workspace,
    navigationTitle,
  };
}
