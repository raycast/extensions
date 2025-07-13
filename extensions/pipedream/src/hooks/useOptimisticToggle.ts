import { showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { toggleWorkflowStatus } from "../services/api";
import { SavedWorkflow } from "../types";

export function useOptimisticToggle(
  workflows: SavedWorkflow[],
  updateWorkflow: (w: SavedWorkflow) => Promise<void>,
  refresh: () => Promise<void>,
  orgId?: string,
) {
  return useCallback(
    async (workflowId: string, newStatus: boolean) => {
      if (!orgId) return;
      const original = workflows.find((w) => w.id === workflowId);
      if (!original) return;

      // optimistic update
      await updateWorkflow(original);
      try {
        await toggleWorkflowStatus(workflowId, orgId, newStatus);
      } catch (error) {
        // revert
        await updateWorkflow(original);
        showToast({
          title: "Error",
          message: error instanceof Error ? error.message : String(error),
          style: Toast.Style.Failure,
        });
      } finally {
        await refresh();
      }
    },
    [orgId, workflows, updateWorkflow, refresh],
  );
}
