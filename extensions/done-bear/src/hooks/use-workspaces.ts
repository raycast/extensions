import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaces } from "../api/client";
import type { WorkspaceSummary } from "../api/types";

export const ALL_WORKSPACES_ID = "all";

export function resolveAllScope(
  workspaceId: string | null,
  allWorkspaceIds: string[] | undefined,
): { isAll: boolean; cacheKey: string } {
  const isAll = workspaceId === ALL_WORKSPACES_ID && allWorkspaceIds !== undefined && allWorkspaceIds.length > 0;
  const cacheKey = isAll ? [...allWorkspaceIds].sort().join(",") : workspaceId || "";
  return { isAll, cacheKey };
}

const SELECTED_WORKSPACE_KEY = "selected-workspace-id";

export function useWorkspaces() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchWorkspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isRestoringSelection, setIsRestoringSelection] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(SELECTED_WORKSPACE_KEY).then((stored) => {
      if (stored) {
        setSelectedWorkspaceId(stored);
      }
      setIsRestoringSelection(false);
    });
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || isRestoringSelection) {
      return;
    }
    if (selectedWorkspaceId === ALL_WORKSPACES_ID) {
      return;
    }
    if (selectedWorkspaceId && data.some((w) => w.id === selectedWorkspaceId)) {
      return;
    }
    // Default to "all" instead of first workspace
    setSelectedWorkspaceId(ALL_WORKSPACES_ID);
    LocalStorage.setItem(SELECTED_WORKSPACE_KEY, ALL_WORKSPACES_ID);
  }, [data, isRestoringSelection, selectedWorkspaceId]);

  const selectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    LocalStorage.setItem(SELECTED_WORKSPACE_KEY, id);
  };

  const workspace: WorkspaceSummary | undefined = data?.find((w) => w.id === selectedWorkspaceId);

  const isAllWorkspaces = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const allWorkspaceIds = useMemo(() => data?.map((w) => w.id) ?? [], [data]);

  return {
    workspaces: data || [],
    workspace,
    workspaceId: selectedWorkspaceId,
    allWorkspaceIds,
    isAllWorkspaces,
    selectWorkspace,
    isLoading: isLoading || isRestoringSelection,
    error,
    revalidate,
  };
}
