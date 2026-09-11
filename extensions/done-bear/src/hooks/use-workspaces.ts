import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { fetchWorkspaces } from "../api/client";
import type { WorkspaceSummary } from "../api/types";

export const ALL_WORKSPACES_ID = "all";

export const resolveAllScope = (
  workspaceId: string | null,
  allWorkspaceIds: string[] | undefined,
): { isAll: boolean; cacheKey: string } => {
  const isAll = workspaceId === ALL_WORKSPACES_ID && allWorkspaceIds !== undefined && allWorkspaceIds.length > 0;
  const cacheKey = isAll ? [...allWorkspaceIds].toSorted().join(",") : workspaceId || "";
  return { cacheKey, isAll };
};

const SELECTED_WORKSPACE_KEY = "selected-workspace-id";

export const useWorkspaces = () => {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchWorkspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isRestoringSelection, setIsRestoringSelection] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(SELECTED_WORKSPACE_KEY);
      if (stored) {
        setSelectedWorkspaceId(stored);
      }
      setIsRestoringSelection(false);
    })();
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
    allWorkspaceIds,
    error,
    isAllWorkspaces,
    isLoading: isLoading || isRestoringSelection,
    revalidate,
    selectWorkspace,
    workspace,
    workspaceId: selectedWorkspaceId,
    workspaces: data || [],
  };
};
