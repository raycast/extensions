import { MenuBarExtra, LaunchType, Icon, open, environment } from "@raycast/api";
import { useSavedWorkflows, useWorkflowActions } from "./hooks/useSavedWorkflows";
import { fetchWorkflowErrors } from "./services/api";
import { useUserInfo } from "./hooks/useUserInfo";
import { useEffect, useState, useCallback } from "react";
import { WorkflowErrorInfo, SavedWorkflow } from "./types";

export default function MenuBarWorkflows() {
  const { workflows, isLoading, refreshWorkflows } = useSavedWorkflows();
  const { toggleMenuBarVisibility } = useWorkflowActions();
  const { orgId } = useUserInfo();
  const [workflowErrors, setWorkflowErrors] = useState<Record<string, WorkflowErrorInfo>>({});

  const fetchErrors = useCallback(async () => {
    if (!orgId || !workflows.length) return;

    const errors: Record<string, WorkflowErrorInfo> = {};
    for (const workflow of workflows) {
      if (workflow.showInMenuBar) {
        try {
          const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
          const recentErrors = errorResponse.data.filter(
            (error) => Date.now() - error.indexed_at_ms < 7 * 24 * 60 * 60 * 1000, // 7 days
          );
          errors[workflow.id] = {
            errorCount: recentErrors.length,
            lastError: recentErrors[0],
          };
        } catch (error) {
          errors[workflow.id] = { errorCount: 0 };
        }
      }
    }
    setWorkflowErrors(errors);
  }, [workflows, orgId]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const getErrorUrl = useCallback((workflowId: string) => {
    return `https://pipedream.com/@/event-history?status=error&id=${workflowId}`;
  }, []);

  const openUrl = useCallback((url: string) => {
    open(url);
  }, []);

  if (environment.launchType === LaunchType.Background) {
    return null;
  }

  const menuBarWorkflows = workflows
    .filter((workflow: SavedWorkflow) => workflow.showInMenuBar)
    .sort((a: SavedWorkflow, b: SavedWorkflow) => a.sortOrder - b.sortOrder);

  return (
    <MenuBarExtra icon="pipedream-logo.png" tooltip="Workflow Status" isLoading={isLoading}>
      <MenuBarExtra.Section title="Workflows">
        {menuBarWorkflows.length === 0 ? (
          <MenuBarExtra.Item title="No workflows in menu bar" />
        ) : (
          menuBarWorkflows.map((workflow) => (
            <MenuBarExtra.Submenu
              key={workflow.id}
              icon={workflowErrors[workflow.id]?.errorCount > 0 ? Icon.ExclamationMark : Icon.Checkmark}
              title={`${workflow.customName} (${workflowErrors[workflow.id]?.errorCount ?? 0})`}
            >
              <MenuBarExtra.Item icon={Icon.Globe} title="Open Workflow" onAction={() => openUrl(workflow.url)} />
              {(workflowErrors[workflow.id]?.errorCount ?? 0) > 0 && (
                <MenuBarExtra.Item
                  icon={Icon.ExclamationMark}
                  title={`View Errors (${workflowErrors[workflow.id]?.errorCount ?? 0} in Last Week)`}
                  onAction={() => openUrl(getErrorUrl(workflow.id))}
                />
              )}
              <MenuBarExtra.Item
                icon={Icon.EyeSlash}
                title="Remove from Menu Bar"
                onAction={() => {
                  toggleMenuBarVisibility(workflow.id);
                  refreshWorkflows();
                }}
              />
            </MenuBarExtra.Submenu>
          ))
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Repeat} title="Refresh" onAction={fetchErrors} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
