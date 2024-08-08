import { useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchWorkflowDetails } from "../services/api";
import { useUserInfo } from "./useUserInfo";
import { SavedWorkflow, WorkflowDetails } from "../types";
import { LOCALSTORAGE_KEY } from "../utils/constants";

type UseSavedWorkflowsReturn = {
  workflows: SavedWorkflow[];
  isLoading: boolean;
  error: Error | undefined;
  refreshWorkflows: () => void;
};

export function useSavedWorkflows(): UseSavedWorkflowsReturn {
  const { orgId, isLoading: isLoadingOrgId, revalidate: revalidateOrgId } = useUserInfo();

  const fetchAndUpdateWorkflows = useCallback(async () => {
    if (!orgId) {
      await revalidateOrgId();
      if (!orgId) throw new Error("Organization ID is missing");
    }

    const savedWorkflowsJson = await LocalStorage.getItem<string>(LOCALSTORAGE_KEY);
    const savedWorkflows: SavedWorkflow[] = savedWorkflowsJson ? JSON.parse(savedWorkflowsJson) : [];

    const updatedWorkflows = await Promise.all(
      savedWorkflows.map(async (workflow) => {
        const details: WorkflowDetails = await fetchWorkflowDetails(workflow.id, orgId);
        return {
          ...workflow,
          triggerCount: details.triggers?.length ?? 0,
          stepCount: details.steps?.length ?? 0,
        };
      }),
    );

    await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(updatedWorkflows));
    return updatedWorkflows;
  }, [orgId, revalidateOrgId]);

  const {
    data: workflows,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchAndUpdateWorkflows, [], {
    execute: !!orgId,
  });

  return {
    workflows: workflows ?? [],
    isLoading: isLoading || isLoadingOrgId,
    error,
    refreshWorkflows: revalidate,
  };
}

type UseWorkflowActionsReturn = {
  addWorkflow: (newWorkflow: SavedWorkflow) => Promise<SavedWorkflow | undefined>;
  updateWorkflow: (updatedWorkflow: SavedWorkflow) => Promise<void>;
  removeWorkflow: (workflowId: string) => Promise<void>;
  toggleMenuBarVisibility: (workflowId: string) => Promise<void>;
};

export function useWorkflowActions(): UseWorkflowActionsReturn {
  const { workflows, refreshWorkflows } = useSavedWorkflows();

  const updateLocalStorage = useCallback(
    async (updatedWorkflows: SavedWorkflow[]) => {
      await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(updatedWorkflows));
      refreshWorkflows();
    },
    [refreshWorkflows],
  );

  const addWorkflow = useCallback(
    async (newWorkflow: SavedWorkflow) => {
      const existingWorkflow = workflows.find((w) => w.id === newWorkflow.id);
      if (existingWorkflow) {
        return existingWorkflow;
      }
      const updatedWorkflows = [...workflows, newWorkflow];
      await updateLocalStorage(updatedWorkflows);
      return undefined;
    },
    [workflows, updateLocalStorage],
  );

  const updateWorkflow = useCallback(
    async (updatedWorkflow: SavedWorkflow) => {
      const updatedWorkflows = workflows.map((workflow) =>
        workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow,
      );
      await updateLocalStorage(updatedWorkflows);
    },
    [workflows, updateLocalStorage],
  );

  const removeWorkflow = useCallback(
    async (workflowId: string) => {
      const updatedWorkflows = workflows.filter((workflow) => workflow.id !== workflowId);
      await updateLocalStorage(updatedWorkflows);
    },
    [workflows, updateLocalStorage],
  );

  const toggleMenuBarVisibility = useCallback(
    async (workflowId: string) => {
      const updatedWorkflows = workflows.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, showInMenuBar: !workflow.showInMenuBar } : workflow,
      );
      await updateLocalStorage(updatedWorkflows);
    },
    [workflows, updateLocalStorage],
  );

  return {
    addWorkflow,
    updateWorkflow,
    removeWorkflow,
    toggleMenuBarVisibility,
  };
}
