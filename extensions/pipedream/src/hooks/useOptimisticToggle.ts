import { useCallback } from "react";
import { toggleWorkflowStatus } from "../services/api";
import { SavedWorkflow } from "../types";
import { showFailureToast } from "@raycast/utils";

export function useOptimisticToggle(
  workflows: SavedWorkflow[],

  updateWorkflow: (w: SavedWorkflow) => Promise<void>,
  refresh: () => Promise<void>,
  orgId?: string,
) {
  return useCallback(
    async (workflowId: string, newStatus: boolean) => {
      if (!orgId || !workflows) return;
      const original = workflows.find((w) => w.id === workflowId);
      if (!original) return;

      // optimistic update
      await updateWorkflow({ ...original, active: newStatus });
      try {
        await toggleWorkflowStatus(workflowId, orgId, newStatus);
      } catch (error) {
        // revert
        await updateWorkflow(original);
        showFailureToast(error);
      } finally {
        await refresh();
      }
    },
    [orgId, workflows, updateWorkflow, refresh],
  );
}
