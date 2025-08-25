import { useCallback } from "react";
import { LocalStorage, getPreferenceValues, Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchWorkflowDetails } from "../services/api";
import { useUserInfo } from "./useUserInfo";
import { SavedWorkflow, WorkflowDetails, WorkflowError } from "../types";
import { LOCALSTORAGE_KEY, PIPEDREAM_BASE_URL } from "../utils/constants";
import { DEMO_WORKFLOWS } from "../utils/demo-data";
import { createErrorResolution } from "../utils/error-resolution";

const cache = new Cache();
const WORKFLOW_DETAILS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Migration function to update workflow URLs to the correct format
const migrateWorkflowUrls = (workflows: SavedWorkflow[]): SavedWorkflow[] => {
  return workflows.map((workflow) => {
    const correctUrl = `${PIPEDREAM_BASE_URL}${workflow.id}`;
    // If the URL is not exactly correct, fix it
    if (workflow.url !== correctUrl) {
      return {
        ...workflow,
        url: correctUrl,
      };
    }
    return workflow;
  });
};

type UseSavedWorkflowsReturn = {
  workflows: SavedWorkflow[];
  isLoading: boolean;
  error: Error | undefined;
  refreshWorkflows: () => void;
};

export function useSavedWorkflows(): UseSavedWorkflowsReturn {
  const { orgId, isLoading: isLoadingOrgId } = useUserInfo();

  const fetchAndUpdateWorkflows = useCallback(async () => {
    const { PIPEDREAM_API_KEY } = getPreferenceValues<Preferences>();
    const isDemo = PIPEDREAM_API_KEY === "demo";
    const currentOrgId = orgId;
    if (!currentOrgId) {
      throw new Error("Organization ID is missing. Please check your API key and try again.");
    }

    const savedWorkflowsJson = await LocalStorage.getItem<string>(LOCALSTORAGE_KEY);
    let savedWorkflows: SavedWorkflow[] = savedWorkflowsJson ? JSON.parse(savedWorkflowsJson) : [];

    // Migrate existing workflows to use the correct URL format
    const migratedWorkflows = migrateWorkflowUrls(savedWorkflows);

    // Save migrated workflows if any were updated
    if (JSON.stringify(migratedWorkflows) !== JSON.stringify(savedWorkflows)) {
      await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(migratedWorkflows));
      savedWorkflows = migratedWorkflows;
    }

    if (isDemo && savedWorkflows.length === 0) {
      savedWorkflows = DEMO_WORKFLOWS;
      await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(savedWorkflows));
    }

    const updatedWorkflows = await Promise.all(
      savedWorkflows.map(async (workflow) => {
        const cacheKey = `workflow_details_${workflow.id}`;
        const cachedDetails = cache.get(cacheKey);
        if (cachedDetails) {
          const { data, timestamp } = JSON.parse(cachedDetails);
          if (Date.now() - timestamp < WORKFLOW_DETAILS_CACHE_TTL) {
            return {
              ...workflow,
              triggerCount: data.triggers?.length ?? 0,
              stepCount: data.steps?.length ?? 0,
            };
          }
        }

        const details: WorkflowDetails = await fetchWorkflowDetails(workflow.id, currentOrgId);
        cache.set(cacheKey, JSON.stringify({ data: details, timestamp: Date.now() }));
        return {
          ...workflow,
          triggerCount: details.triggers?.length ?? 0,
          stepCount: details.steps?.length ?? 0,
        };
      }),
    );

    await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(updatedWorkflows));
    return updatedWorkflows;
  }, [orgId]);

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
  removeAllWorkflows: () => Promise<void>;
  markWorkflowAsFixed: (workflowId: string, currentErrors: WorkflowError[]) => Promise<void>;
  unmarkWorkflowAsFixed: (workflowId: string) => Promise<void>;
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
      // Check against actual localStorage data to avoid race conditions
      const savedWorkflowsJson = await LocalStorage.getItem<string>(LOCALSTORAGE_KEY);
      const savedWorkflows: SavedWorkflow[] = savedWorkflowsJson ? JSON.parse(savedWorkflowsJson) : [];

      const existingWorkflow = savedWorkflows.find((w) => w.id === newWorkflow.id);
      if (existingWorkflow) {
        return existingWorkflow;
      }

      const updatedWorkflows = [...savedWorkflows, newWorkflow];
      await updateLocalStorage(updatedWorkflows);
      return undefined; // Return undefined to indicate new workflow was added
    },
    [updateLocalStorage],
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

  const removeAllWorkflows = useCallback(async () => {
    await updateLocalStorage([]);
  }, [updateLocalStorage]);

  const markWorkflowAsFixed = useCallback(
    async (workflowId: string, currentErrors: WorkflowError[]) => {
      const updatedWorkflows = workflows.map((workflow) =>
        workflow.id === workflowId
          ? { ...workflow, errorResolution: createErrorResolution(currentErrors, workflow.errorResolution) }
          : workflow,
      );
      await updateLocalStorage(updatedWorkflows);
    },
    [workflows, updateLocalStorage],
  );

  const unmarkWorkflowAsFixed = useCallback(
    async (workflowId: string) => {
      const updatedWorkflows = workflows.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, errorResolution: undefined } : workflow,
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
    removeAllWorkflows,
    markWorkflowAsFixed,
    unmarkWorkflowAsFixed,
  };
}
